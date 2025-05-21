// awsAuth.js

// Constants
const BASE_URL = "https://29xxlo1ehl.execute-api.us-east-2.amazonaws.com/prod/cognito_api";
const CLIENT_ID = "5d9qolco5mqc2bm9o5jjpe78la";
const SECRET_NAME = "DSI-prod-remaining-secrets";
const USER_POOL_ID = "us-east-2_QjHn3QW1G";

// Helper function for making API calls
async function postToCognitoApi(payload) {
  const response = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("API request failed");
  }
  return response;
}

// Send OTP for forgot password action
export async function sendOTP(email) {
  const payload = {
    action: "FORGOT_PASSWORD",
    email_id: email,
    ClientID: CLIENT_ID,
    secret_name: SECRET_NAME
  };
  return postToCognitoApi(payload);
}

// Verify OTP and reset password
export async function verifyOTPAndReset(email, otp, password) {
  const payload = {
    action: "CONFIRM_FORGOT_PASSWORD",
    email_id: email,
    ClientID: CLIENT_ID,
    code: otp,
    new_password: password,
    secret_name: SECRET_NAME
  };
  return postToCognitoApi(payload);
}

// Initiate a temporary password reset
export async function firstResetPassword(email) {
  const payload = {
    action: "RESET_TEMP_PASSWORD",
    email_id: email,
    ClientID: CLIENT_ID,
    user_pool_id: USER_POOL_ID,
    secret_name: SECRET_NAME
  };
  return postToCognitoApi(payload);
}
