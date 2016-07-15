function noNullVals(obj) {
  var empty = [];
  if (_.isEmpty(obj))
    empty.push(null);
  for (var key in obj) {
    if (obj[key] == null || obj[key] == '')
      empty.push(key);
  }
  return empty;
}