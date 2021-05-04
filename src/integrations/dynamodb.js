const AWS = require("aws-sdk")
const { name } = require("../../package.json")

module.exports.getAuth = async () => {
  console.log("getAuth called")
  AWS.config.update({ region: "us-east-1" })
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })

  const params = {
    TableName: "destiny-insights-backend-bungie-api-auth",
    KeyConditionExpression: "app = :app",
    ExpressionAttributeValues: { ":app": { "S": name } }
  }

  const response = await ddb.query(params).promise()
  const authObject = response.Items[0]
  const result = {}
  for (const key of Object.keys(authObject)) {
    result[key] = authObject[key].S || authObject[key].N
  }

  return result
}

module.exports.setAuth = async (newAuth) => {
  console.log("setAuth called")
  AWS.config.update({ region: "us-east-1" })
  const docClient = new AWS.DynamoDB.DocumentClient()

  const params = {
    TableName: "destiny-insights-backend-bungie-api-auth",
    Key: { app: name },
    // eslint-disable-next-line max-len
    UpdateExpression: "set #ei = :expiresIn, #ltr = :lastTokenRefresh, #mi = :membershipId, #at = :accessToken, #tt = :tokenType, #rt = :refreshToken, #rei = :refreshExpiresIn",
    ExpressionAttributeValues: {
      ":expiresIn": newAuth.expiresIn,
      ":lastTokenRefresh": newAuth.lastTokenRefresh,
      ":membershipId": newAuth.membershipId,
      ":accessToken": newAuth.accessToken,
      ":tokenType": newAuth.tokenType,
      ":refreshToken": newAuth.refreshToken,
      ":refreshExpiresIn": newAuth.refreshExpiresIn
    },
    ExpressionAttributeNames: {
      "#ei": "expiresIn",
      "#ltr": "lastTokenRefresh",
      "#mi": "membershipId",
      "#at": "accessToken",
      "#tt": "tokenType",
      "#rt": "refreshToken",
      "#rei": "refreshExpiresIn"
    }
  }
  await docClient.update(params).promise()
}

module.exports.getModSalesInLastYear = async (mod) => {
  console.log("getModSalesInLastYear called")
  AWS.config.update({ region: "us-east-1" })
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })
  const responses = []

  let oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  // eslint-disable-next-line newline-per-chained-call
  oneYearAgo = oneYearAgo.toISOString().split("T")[0]

  const query = {
    TableName: "destiny-insights-backend-mods",
    FilterExpression: "#ts > :startDate and #modName = :name",
    ExpressionAttributeValues: {
      // AWS DynamoDB uses single char for types
      // eslint-disable-next-line id-length
      ":startDate": { S: oneYearAgo },
      // eslint-disable-next-line id-length
      ":name": { S: mod.name }
    },
    ExpressionAttributeNames: {
      "#ts": "timestamp",
      "#modName": "name"
    }
  }

  const response = await ddb.scan(query).promise()
  responses.push(...response.Items)

  const results = []
  for (const tweet of responses) {
    results.push(new Date(tweet.timestamp.S))
  }

  const sortedResults = results.sort((first, second) => {
    return new Date(second) - new Date(first)
  })

  return sortedResults
}

module.exports.getLastSoldMods = async () => {
  console.log("getLastSoldMods called")
  AWS.config.update({ region: "us-east-1" })
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })
  const responses = []
  const oneDayAgo = new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).toISOString()

  const query = {
    TableName: "destiny-insights-backend-mods",
    FilterExpression: "#ts > :startDate",
    ExpressionAttributeValues: {
      // AWS DynamoDB uses single char for types
      // eslint-disable-next-line id-length
      ":startDate": { S: oneDayAgo }
    },
    ExpressionAttributeNames: {
      "#ts": "timestamp"
    }
  }

  const response = await ddb.scan(query).promise()
  responses.push(...response.Items)

  const results = []
  for (const sale of responses) {
    results.push({
      timestamp: sale.timestamp.S,
      name: sale.name.S,
      type: sale.type.S
    })
  }

  const sortedResults = results.sort((first, second) => {
    return new Date(second.timestamp) - new Date(first.timestamp)
  })

  return sortedResults
}

module.exports.addMod = async (mod) => {
  console.log("addMod called")

  let type = mod.type
  if (type.includes("Armor")) {
    type = "Armor Mod"
  } else if (type === "Legendary Weapon Mod") {
    type = "Weapon Mod"
  } else if (type === "Common Charged with Light Mod" || type === "Common Warmind Cell Mod") {
    type = "Combat Style Mod"
  }

  const now = new Date().toISOString()
  AWS.config.update({ region: "us-east-1" })
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })

  const params = {
    TableName: "destiny-insights-backend-mods",
    Item: {
      // AWS DynamoDB uses single char for types
      // eslint-disable-next-line id-length
      key: { S: `${now} (${type})` },
      // eslint-disable-next-line id-length
      timestamp: { S: now },
      // eslint-disable-next-line id-length
      type: { S: type },
      // eslint-disable-next-line id-length
      name: { S: mod.name }
    }
  }

  await ddb.putItem(params).promise()
}
