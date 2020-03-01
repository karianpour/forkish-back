export function pause(timout: number): Promise<void> {
  // tslint:disable-next-line:no-shadowed-variable
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timout);
  });
}


/** @private is the given object a Function? */
export const isFunction = (obj: any): obj is Function =>
  typeof obj === 'function';

/** @private is the given object an Object? */
export const isObject = (obj: any): obj is Object =>
  obj !== null && typeof obj === 'object';

/** @private is the given object an integer? */
export const isInteger = (obj: any): boolean =>
  String(Math.floor(Number(obj))) === obj;

/** @private is the given object a string? */
export const isString = (obj: any): obj is string =>
  Object.prototype.toString.call(obj) === '[object String]';

/** @private is the given object a NaN? */
// eslint-disable-next-line no-self-compare
export const isNaN = (obj: any): boolean => obj !== obj;

/** @private is the given object/value a promise? */
export const isPromise = (value: any): value is PromiseLike<any> =>
  isObject(value) && isFunction(value.then);

export const hasNonEmptyValue = (obj: any): boolean => {
  if(isObject(obj)){
    if(Array.isArray(obj)){
      for(const v of obj){
        if(hasNonEmptyValue(v)) return true;
      }
    }else {
      for(const key of Object.keys(obj)){
        if(hasNonEmptyValue(obj[key])) return true;
      }
    }
  }else{
    if(obj){
      return true;
    }
  }
  return false;
}

export const toPath = (key: string): string[] => {
  const path: string[] = [];
  const parts = key.split('.');
  parts.forEach( part => {
    const i1 = part.indexOf('[');
    if(i1>=0){
      path.push(part.substring(0, i1));
      const i2 = part.indexOf(']');
      if(i2>=0){
        path.push(part.substring(i1+1, i2));
      }else{
        //error but ignore
      }
    }else{
      path.push(part);
    }
  });
  return path;
  /*
_.toPath('a.b.c');
// => ['a', 'b', 'c']
 
_.toPath('a[0].b.c');
// => ['a', '0', 'b', 'c']
   */
}

export const clone = (obj: any): any => {
  if(Array.isArray(obj)){
    return [...obj];
  }else if(isObject(obj)){
    return {...obj};
  }else{
    return obj;
  }
}

export function getIn(
  obj: any,
  key: string | string[],
  def?: any,
  p: number = 0
) {
  const path = Array.isArray(key) ? key : toPath(key);
  while (obj && p < path.length) {
    obj = obj[path[p++]];
  }
  return obj === undefined ? def : obj;
}

export function setIn(obj: any, path: string, value: any): any {
  let res: any = clone(obj); // this keeps inheritance when obj is a class
  let resVal: any = res;
  let i = 0;
  let pathArray = toPath(path);

  for (; i < pathArray.length - 1; i++) {
    const currentPath: string = pathArray[i];
    let currentObj: any = getIn(obj, pathArray.slice(0, i + 1));

    if (currentObj && (isObject(currentObj) || Array.isArray(currentObj))) {
      resVal = resVal[currentPath] = clone(currentObj);
    } else {
      const nextPath: string = pathArray[i + 1];
      resVal = resVal[currentPath] =
        isInteger(nextPath) && Number(nextPath) >= 0 ? [] : {};
    }
  }

  // Return original object if new value is the same as current
  if ((i === 0 ? obj : resVal)[pathArray[i]] === value) {
    return obj;
  }

  if (value === undefined) {
    delete resVal[pathArray[i]];
  } else {
    resVal[pathArray[i]] = value;
  }

  // If the path array has a single element, the loop did not run.
  // Deleting on `resVal` had no effect in this scenario, so we delete on the result instead.
  if (i === 0 && value === undefined) {
    delete res[pathArray[i]];
  }

  return res;
}

/**
 * Recursively a set the same value for all keys and arrays nested object, cloning
 * @param object
 * @param value
 * @param visited
 * @param response
 */
export function setNestedObjectValues<T>(
  object: any,
  value: any,
  visited: any = new WeakMap(),
  response: any = {}
): T {
  for (let k of Object.keys(object)) {
    const val = object[k];
    if (isObject(val)) {
      if (!visited.get(val)) {
        visited.set(val, true);
        // In order to keep array values consistent for both dot path  and
        // bracket syntax, we need to check if this is an array so that
        // this will output  { friends: [true] } and not { friends: { "0": true } }
        response[k] = Array.isArray(val) ? [] : {};
        setNestedObjectValues(val, value, visited, response[k]);
      }
    } else {
      response[k] = value;
    }
  }

  return response;
}

import { camelCase } from "change-case";

export function camelCaseObject (data: any): any {
  if(Array.isArray(data)){
    const newData = data.map( d => {
      if(d && typeof d === "object"){
        return camelCaseObject(d)
      }else{
        return d;
      }
    });
    return newData;
  }else{
    const newData = {};
    Object.keys(data).forEach(function(key) {
      if(data[key] && typeof data[key] === "object"){
        newData[camelCase(key)] = camelCaseObject(data[key]);
      }else{
        newData[camelCase(key)] = data[key];
      }
    });
    return newData;
  }
}