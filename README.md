# Codingchallenge - ImageUploader

This is a project for a coding challenge to upload images via GraphQL to AWS and create a thumbnail of it.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run deploy`  deploy this stack to your default AWS account/region

## Requirements

- [x] Deployment via cdk
- [x] S3 Bucket that invokes a lambda via a queue buffer for new files
- [x] DynamoDB
- [ ] Thumbnail resizing functionality in lambda
- [ ] Storing meta data in dynamodb
- [ ] Guards about uploaded files (5mb, only images)
- [ ] API to upload and retrieve file information
- [ ] Linter (added to project but `eslint --fix` doesn't do anything)

## Soft requirements

- [ ] Unit tests
- [ ] CI / CD via GitHub Actions or AWS-Codepipeline
