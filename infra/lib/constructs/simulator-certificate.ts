import { CustomResource, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/** Where `device-sim fetch-cert` reads the certificate from. */
export const CERTIFICATE_SECRET_NAME = "suryasaathi/simulator-certificate";

// Creates an active X.509 certificate and key pair in IoT Core and stores the PEMs in
// Secrets Manager, so the private key never appears in CloudFormation.
const HANDLER = `
import json
import boto3

iot = boto3.client("iot")
secrets = boto3.client("secretsmanager")


def on_event(event, context):
    secret = event["ResourceProperties"]["SecretArn"]
    kind = event["RequestType"]
    if kind == "Create":
        cert = iot.create_keys_and_certificate(setAsActive=True)
        secrets.put_secret_value(
            SecretId=secret,
            SecretString=json.dumps({
                "certificateArn": cert["certificateArn"],
                "certificatePem": cert["certificatePem"],
                "privateKey": cert["keyPair"]["PrivateKey"],
            }),
        )
        return {"PhysicalResourceId": cert["certificateId"],
                "Data": {"CertificateArn": cert["certificateArn"]}}
    cert_id = event["PhysicalResourceId"]
    if kind == "Delete":
        try:
            iot.update_certificate(certificateId=cert_id, newStatus="INACTIVE")
            iot.delete_certificate(certificateId=cert_id, forceDelete=True)
        except iot.exceptions.ResourceNotFoundException:
            pass
        return {"PhysicalResourceId": cert_id}
    arn = iot.describe_certificate(certificateId=cert_id)["certificateDescription"]["certificateArn"]
    return {"PhysicalResourceId": cert_id, "Data": {"CertificateArn": arn}}
`;

export class SimulatorCertificate extends Construct {
  readonly certificateArn: string;
  readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.secret = new secretsmanager.Secret(this, "Secret", {
      secretName: CERTIFICATE_SECRET_NAME,
      description: "SuryaSaathi device simulator: IoT certificate and private key (PEM)",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const onEvent = new lambda.Function(this, "Handler", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.on_event",
      code: lambda.Code.fromInline(HANDLER),
      timeout: Duration.seconds(30),
    });
    onEvent.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "iot:CreateKeysAndCertificate",
          "iot:DescribeCertificate",
          "iot:UpdateCertificate",
          "iot:DeleteCertificate",
        ],
        resources: ["*"],
      }),
    );
    this.secret.grantWrite(onEvent);

    const provider = new cr.Provider(this, "Provider", { onEventHandler: onEvent });
    const resource = new CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: { SecretArn: this.secret.secretArn },
    });
    this.certificateArn = resource.getAttString("CertificateArn");
  }
}
