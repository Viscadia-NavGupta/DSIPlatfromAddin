import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: "us-east-1" },
    identityPoolId: "us-east-1:your-pool-id",
  }),
});

const upload = async (file) => {
  const command = new PutObjectCommand({
    Bucket: "your-bucket",
    Key: "uploads/" + file.name,
    Body: file,
  });
  await s3Client.send(command);
};
