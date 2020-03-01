import * as bent from "bent";

import * as Debug from 'debug';
const debug = Debug('sahmane-sms');

const smsService = {
  basePath: process.env.SMS_BASEPATH || `https://RestfulSms.com/api`,
  ApiKey: process.env.SMS_ApiKey,
  SecretKey: process.env.SMS_SecretKey,
  ForgetPassTemplateId: process.env.SMS_ForgetPassTemplateId,
  SendIgnore: process.env.SMS_SendIgnore,
}

const requestForTocken = bent(
  `${smsService.basePath}/Token`,
  'POST',
  'json',
  200
);

const requestForSMS = bent(
  `${smsService.basePath}/VerificationCode`,
  'POST',
  'json',
  200,
);

interface IToken {token: string, timeout: Date};

let token: IToken = null;

export async function sendActivationSMS(mobileNumber: string, activationCode: string): Promise<boolean>{
  if(smsService.SendIgnore){
    //Only in development mode it make sens for testing
    return true;
  }

  const smsToken = await getToken();

  if(!smsToken){
    return false;
  }

  const headers = {
    "x-sms-ir-secure-token": smsToken,
  };
  const body = {
    "Code": activationCode,
    "MobileNumber": mobileNumber,
  };

  try {
    const res: any = await requestForSMS('', body, headers);

    debug(`sms sent with response : ${JSON.stringify(res)}.`);

    return true;
  } catch (err) {
    debug(`failed to fetch sms token with ${err}`);
  }
  return false;
}

async function getToken(): Promise<string>{
  const now = new Date();
  if(token && token.timeout.getTime() < now.getTime()){
    token = null;
  }
  if(!token){
    token = await fetchToken();
  }
  if(token){
    return token.token;
  }
}

async function fetchToken(): Promise<IToken> {
  const body: bent.RequestBody = {
    "UserApiKey": smsService.ApiKey,
    "SecretKey": smsService.SecretKey,
  };

  try {
    const res: any = await requestForTocken('', body);

    const {"TokenKey": token} = res;

    if(token){
      debug(`token obtained${token}.`);
      const timeout = new Date( (new Date()).getTime() + 25 * 60 * 1000 );
      return {token, timeout};
    }else{
      debug(`failed to fetch sms token with ${JSON.stringify(res)}`);
    }
  } catch (err) {
    debug(`failed to fetch sms token with ${err}`);
  }

}

// sendAvticationCode('09121161998', '4321')
