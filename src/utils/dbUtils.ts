import { snakeCase } from 'change-case';

export const snakeCasedFields = (fields:string[]) => fields.map(f => {const sf = snakeCase(f); return sf===f ? f : `${sf} as "${f}"`});
