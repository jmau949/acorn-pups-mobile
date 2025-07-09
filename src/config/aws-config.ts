import { Amplify } from "aws-amplify";
import { ENV_CONFIG } from "../../env";

const awsConfig = {
  Auth: {
    Cognito: {
      region: ENV_CONFIG.AWS_REGION,
      userPoolId: ENV_CONFIG.AWS_USER_POOL_ID,
      userPoolClientId: ENV_CONFIG.AWS_USER_POOL_CLIENT_ID,
      signUpVerificationMethod: "code" as const,
      loginWith: {
        email: true,
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
};

export const configureAmplify = () => {
  Amplify.configure(awsConfig);
};

export default awsConfig;
