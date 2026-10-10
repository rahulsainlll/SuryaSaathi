import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import type { Construct } from "constructs";

/** Systems, readings, cases and the expected-output cache (keys match suryasaathi_core.store). */
export class DataStack extends Stack {
  readonly systems: dynamodb.Table;
  readonly readings: dynamodb.Table;
  readonly cases: dynamodb.Table;
  readonly expected: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const S = dynamodb.AttributeType.STRING;
    const common = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // All data in this project is simulated; `cdk destroy` removes it.
      removalPolicy: RemovalPolicy.DESTROY,
    };

    this.systems = new dynamodb.Table(this, "Systems", {
      ...common,
      tableName: "suryasaathi-systems",
      partitionKey: { name: "systemId", type: S },
    });
    this.readings = new dynamodb.Table(this, "Readings", {
      ...common,
      tableName: "suryasaathi-readings",
      partitionKey: { name: "systemId", type: S },
      sortKey: { name: "date", type: S },
      // New readings invoke the diagnosis agent.
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });
    this.cases = new dynamodb.Table(this, "Cases", {
      ...common,
      tableName: "suryasaathi-cases",
      partitionKey: { name: "caseId", type: S },
    });
    this.cases.addGlobalSecondaryIndex({
      indexName: "bySystem",
      partitionKey: { name: "systemId", type: S },
      sortKey: { name: "openedAt", type: S },
    });
    this.expected = new dynamodb.Table(this, "Expected", {
      ...common,
      tableName: "suryasaathi-expected",
      partitionKey: { name: "systemId", type: S },
      sortKey: { name: "date", type: S },
    });
  }

  /** Table names for the services' environment (read by suryasaathi_core.config). */
  get tableEnvironment(): Record<string, string> {
    return {
      SYSTEMS_TABLE: this.systems.tableName,
      READINGS_TABLE: this.readings.tableName,
      CASES_TABLE: this.cases.tableName,
      EXPECTED_TABLE: this.expected.tableName,
    };
  }
}
