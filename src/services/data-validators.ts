import { PoolClient } from "pg";
import { camelCase } from 'change-case';
import { BadRequest, NotFound, Conflict } from 'http-errors';
import * as sql from 'sql-bricks-postgres';
import { createError } from "./value-validators";

export async function uniqueField(client: PoolClient, tableName: string, idField: string | string[], uniqueField: string | string[], idValue: any | any[], uniqueFieldValue: any | any[], fieldTranslation: string, err?: any[]){

  let select = sql.select(idField);
  select = select.from(tableName);

  if(Array.isArray(idField)){
    if(!Array.isArray(idValue)){
      throw `idValue should be array as idField is an array.`
    }
    if(idValue.length !== idField.length){
      throw `idValue lenght should be ${idValue.length} but it is ${idField.length}`
    }
    idField.forEach((idf, i)=>{
      select = select.where(sql.notEq(idf, idValue[i]));
    })
  }else{
    select = select.where(sql.notEq(idField, idValue));
  }
  if(Array.isArray(uniqueField)){
    if(!Array.isArray(uniqueFieldValue)){
      throw `uniqueFieldValue should be array as uniqueField is an array.`
    }
    if(uniqueFieldValue.length !== uniqueField.length){
      throw `uniqueFieldValue lenght should be ${uniqueFieldValue.length} but it is ${uniqueField.length}`
    }
    uniqueField.forEach((uf, i) => {
      select = select.where(sql.eq(uf, uniqueFieldValue[i]));
    })
  }else{
    select = select.where(sql.eq(uniqueField, uniqueFieldValue));
  }
  select = select.limit('1');

  const rr = await client.query(select.toParams());

  // const rr = await client.query({
  //   text:`select ${idField} from ${tableName} where ${uniqueField} = $2 and id != $1 limit 1`,
  //   values: [idValue, uniqueFieldValue]
  // });
  if (rr && rr.rows.length > 0) {
    if(Array.isArray(uniqueField)){
      const fields = uniqueField.map(uf => camelCase(uf));
      const payload = { codes: {}};
      fields.forEach( field => {
        payload.codes[field] = [{code: 'duplicate', params: {field: fieldTranslation}}];
        payload[field] = [`${field} already defined!`];
      })
      const error = new Conflict(JSON.stringify(payload));
      throw error;
    }else{
      const field = camelCase(uniqueField);
      if(err){
        err.push(createError(field, 'duplicate', `${field} already defined!`, {field: fieldTranslation}));
      }else{
        const error = new Conflict(JSON.stringify({
          codes: { [field]: [{code: 'duplicate', params: {field: fieldTranslation}}] },
          [field]: [`${field} already defined!`],
        }));
        throw error;
      }
    }
  }
}

export function isValidDate(d: any) {
  return d instanceof Date && !isNaN(d.getTime());
}