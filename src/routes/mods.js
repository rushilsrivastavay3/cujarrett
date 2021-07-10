const { getBanshee44Inventory } = require ("../util/get-banshee-44-inventory.js")
const { getValidAuth } = require("../util/get-valid-auth.js")
const { name, version } = require("../../package.json")

module.exports = async (api) => {
  // eslint-disable-next-line no-unused-vars
  api.get("/mods", async (request, response) => {
    console.log("/mods called")
    let result

    try {
      response.header("Access-Control-Allow-Origin", "*")
      const { auth, isTokenRefreshNeeded, lastTokenRefresh } = await getValidAuth()
      const {
        inventory,
        lastUpdated,
        authRetries,
        manifestRetries,
        usedCachedData,
        inventoryItemDefinitionEndpoint
      } = await getBanshee44Inventory(auth)

      result = {
        inventory,
        metadata: {
          name,
          version,
          now: new Date().toISOString(),
          lastUpdated,
          lastTokenRefresh,
          usedCachedAuth: !isTokenRefreshNeeded,
          usedCachedData,
          authRetries,
          manifestRetries,
          inventoryItemDefinitionEndpoint
        }
      }
    } catch (error) {
      response.sendStatus(424)
      result = { "error": error.message }
    }

    console.log(`Completing request:\n${JSON.stringify(result, null, "  ")}`)
    return JSON.stringify(result, null, "  ")
  })
}
