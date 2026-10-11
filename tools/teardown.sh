#!/usr/bin/env bash
# Remove everything SuryaSaathi put in this AWS account: the seven application stacks, the
# CDK bootstrap (stack, versioned asset bucket, container-image repository) and the log
# groups CloudFormation leaves behind. See docs/runbook.md section 12.
set -euo pipefail

YES=false
KEEP_BOOTSTRAP=false
for arg in "$@"; do
  case "$arg" in
    --yes | -y) YES=true ;;
    --keep-bootstrap) KEEP_BOOTSTRAP=true ;;
    *)
      echo "usage: tools/teardown.sh [--yes] [--keep-bootstrap]" >&2
      exit 2
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
STACKS=(
  SuryaSaathi-Console SuryaSaathi-Rollups SuryaSaathi-Whatsapp SuryaSaathi-Agents
  SuryaSaathi-ExpectedOutput SuryaSaathi-Ingest SuryaSaathi-Data
)

# Never operate on an account the caller didn't mean to touch.
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
IDENTITY="$(aws sts get-caller-identity --query Arn --output text)"
QUALIFIER=hnb659fds # CDK's default bootstrap qualifier
ASSET_BUCKET="cdk-${QUALIFIER}-assets-${ACCOUNT}-${REGION}"
IMAGE_REPO="cdk-${QUALIFIER}-container-assets-${ACCOUNT}-${REGION}"

echo "Account  : ${ACCOUNT}  (${IDENTITY})"
echo "Region   : ${REGION}"
echo "Profile  : ${AWS_PROFILE:-<none set>}"
echo
echo "This will delete:"
echo "  - CloudFormation stacks: ${STACKS[*]}"
if [[ "$KEEP_BOOTSTRAP" == false ]]; then
  echo "  - CDKToolkit stack, S3 bucket ${ASSET_BUCKET} (all versions), ECR repo ${IMAGE_REPO}"
else
  echo "  - (keeping the CDK bootstrap)"
fi
echo "  - the simulator certificate secret, and leftover SuryaSaathi log groups"
echo

if [[ "$YES" == false ]]; then
  read -r -p "Type the account id (${ACCOUNT}) to confirm: " reply
  [[ "$reply" == "$ACCOUNT" ]] || {
    echo "Aborted."
    exit 1
  }
fi

say() { printf '\n==> %s\n' "$1"; }
# Most of what follows is already-gone-is-fine, so failures must not stop the teardown.
quiet() { "$@" >/dev/null 2>&1 || true; }

say "Destroying the application stacks"
(cd "${REPO_ROOT}/infra" && pnpm cdk destroy --all --force) || {
  echo "cdk destroy did not finish cleanly; deleting the stacks directly."
  for s in "${STACKS[@]}"; do
    quiet aws cloudformation delete-stack --stack-name "$s"
  done
  for s in "${STACKS[@]}"; do
    quiet aws cloudformation wait stack-delete-complete --stack-name "$s"
  done
}

say "Forcing deletion of the simulator certificate secret"
for arn in $(aws secretsmanager list-secrets \
  --query "SecretList[?contains(Name,'SimulatorCertificate') || contains(Name,'SuryaSaathi')].ARN" \
  --output text 2>/dev/null || true); do
  echo "  $arn"
  quiet aws secretsmanager delete-secret --secret-id "$arn" --force-delete-without-recovery
done

if [[ "$KEEP_BOOTSTRAP" == false ]]; then
  say "Emptying the CDK asset bucket ${ASSET_BUCKET}"
  if aws s3api head-bucket --bucket "$ASSET_BUCKET" >/dev/null 2>&1; then
    # The bucket is versioned, so every version and delete marker has to go before the
    # bucket itself can be removed.
    while :; do
      json="$(aws s3api list-object-versions --bucket "$ASSET_BUCKET" --max-keys 500 \
        --query '{Objects: (([Versions, DeleteMarkers][] || [])[].{Key:Key,VersionId:VersionId})}' \
        --output json 2>/dev/null || echo '{"Objects":null}')"
      count="$(printf '%s' "$json" | python3 -c 'import json,sys; o=json.load(sys.stdin).get("Objects") or []; print(len(o))')"
      [[ "$count" == "0" ]] && break
      printf '%s' "$json" >/tmp/surya-teardown-batch.json
      quiet aws s3api delete-objects --bucket "$ASSET_BUCKET" --delete "file:///tmp/surya-teardown-batch.json"
      echo "  removed ${count} object versions"
    done
    rm -f /tmp/surya-teardown-batch.json
    quiet aws s3api delete-bucket --bucket "$ASSET_BUCKET"
    echo "  bucket deleted"
  else
    echo "  not present"
  fi

  say "Deleting the CDK image repository ${IMAGE_REPO}"
  quiet aws ecr delete-repository --repository-name "$IMAGE_REPO" --force
  echo "  done"

  say "Deleting the CDKToolkit stack"
  quiet aws cloudformation delete-stack --stack-name CDKToolkit
  quiet aws cloudformation wait stack-delete-complete --stack-name CDKToolkit
  echo "  done"
fi

say "Deleting leftover log groups"
for g in $(aws logs describe-log-groups \
  --query "logGroups[?contains(logGroupName,'SuryaSaathi') || contains(logGroupName,'suryasaathi')].logGroupName" \
  --output text 2>/dev/null || true); do
  echo "  $g"
  quiet aws logs delete-log-group --log-group-name "$g"
done

say "Teardown complete"
echo "Remaining SuryaSaathi/CDKToolkit stacks (should be empty):"
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE \
  --query "StackSummaries[?starts_with(StackName,'SuryaSaathi') || StackName=='CDKToolkit'].StackName" \
  --output text
