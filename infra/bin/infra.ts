#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { addStacks } from "../lib/index.js";

const app = new App();

addStacks(app, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION,
  },
});
