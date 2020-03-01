export type ErrorCode = {
  [key: string]: { code: string, params: {[key: string]: string | number | boolean } }[],
}

export type ErrorPayload = {
  codes?: ErrorCode,
} & {
  [key: string]: string[],
}

export class SocketCommandError {
  constructor(
    public readonly command: string,
    public readonly message: string,
    public readonly payload?: ErrorPayload,
  ) {

  }

  public static CreateFromDatabaseError(command: string, err: any){
    let payload = undefined;
    let message = err.toString();
    if(err.message && typeof err.message === 'string' && err.message.startsWith('json ')){
      payload = JSON.parse(err.message.substring(5));
      message = undefined;
    }
    return new SocketCommandError(command, message, payload);
  }
}

export class ActionExpectationError {
  constructor(
    public readonly message?: string,
    public readonly payload?: ErrorPayload,
    public readonly error: string = 'Expectation Failed',
    public readonly statusCode: number = 417,
  ) {

  }

  public static CreateFromErrorCode(codes: ErrorCode){
    const payload: ErrorPayload = {};
    payload.codes = codes;
    return new ActionExpectationError(undefined, payload);
  }

  public static CreateFromDatabaseError(err: any){
    let payload = undefined;
    let message = err.toString();
    if(err.message && typeof err.message === 'string' && err.message.startsWith('json ')){
      payload = JSON.parse(err.message.substring(5));
      message = undefined;
    }
    return new ActionExpectationError(message, payload);
  }
}
