import { TooManyRequests } from 'http-errors';

interface FailureIP {
  ip: string;
  failureCount: number;
  lastFailure: Date;
  bannedTill?: Date;
  bannedCount?: number;
}

const Base_Ban_Timeout = 1000 * 60;
const Base_Ban_Threshold = 2;
const Ban_Failure_Timeout = 1000 * 100;
const Ban_Max_Failure_Count = 5;

const failedIps: FailureIP[] = [];

export function checkForBanned(ip: string){
  const failedIp = failedIps.find( f => f.ip === ip);
  if(failedIp && failedIp.bannedTill && failedIp.bannedTill.getTime() > (new Date()).getTime()){
    throw new TooManyRequests(` You have send too many failed requests you are banned till ${failedIp.bannedTill.toUTCString()}`);
  }
}

export function addFailureForBanned(ip: string){
  const failedIp = failedIps.find( f => f.ip === ip);
  if(failedIp){
    const now = new Date();
    if(now.getTime() - failedIp.lastFailure.getTime() < Ban_Failure_Timeout){
      failedIp.failureCount++;
      if(failedIp.failureCount > Ban_Max_Failure_Count){
        failedIp.bannedCount = (failedIp.bannedCount ? failedIp.bannedCount : 0) + 1;
        failedIp.bannedTill = new Date(now.getTime() + Base_Ban_Timeout * Math.pow(Base_Ban_Threshold, failedIp.bannedCount));
      }
    }else{
      failedIp.failureCount = 1;
    }
    failedIp.lastFailure = now;
  }else{
    failedIps.push({ip, failureCount: 1, lastFailure: new Date()});
  }
}
