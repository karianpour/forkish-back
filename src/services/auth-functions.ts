export function hasRole(user: any, checkingRoles: string | string[]): boolean {
  if(!user || !user.roles) return false;
  const { roles } = user; 

  if(typeof roles === 'string'){
    if(typeof checkingRoles === 'string'){
      return roles === checkingRoles;
    }else{
      return checkingRoles.findIndex( r => r === roles) > -1;
    }
  }
  if(Array.isArray(roles)){
    if(typeof checkingRoles === 'string'){
      return roles.findIndex( r => r === checkingRoles) > -1;
    }else{
      return roles.some( r => checkingRoles.findIndex( cr => cr === r) > -1);
    }
  }

  return false;
}