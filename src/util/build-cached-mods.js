const fetch = require("node-fetch")
const { getManifest } = require("./get-manifest")
// eslint-disable-next-line max-len
const { getInventoryItemDefinitionEndpoint } = require("./get-inventory-item-definition-endpoint.js")
const { getSandboxPerkDefinitionEndpoint } = require("./get-sandbox-perk-definition-endpoint.js")

module.exports.buildCachedMods = async () => {
  const { manifest } = await getManifest()
  const inventoryItemDefinitionEndpoint = getInventoryItemDefinitionEndpoint(manifest)
  const sandboxPerkDefinitionEndpoint = getSandboxPerkDefinitionEndpoint(manifest)

  const itemDefinitionsResponse = await fetch(inventoryItemDefinitionEndpoint)
  const itemDefinitions = await itemDefinitionsResponse.json()
  const sandboxPerkDefinitionResponse = await fetch(sandboxPerkDefinitionEndpoint)
  const sandboxPerkDefinitions = await sandboxPerkDefinitionResponse.json()

  const output = {}
  for (const item in itemDefinitions) {
    const name = itemDefinitions[item].displayProperties.name
    const type = itemDefinitions[item].itemTypeAndTierDisplayName
    const icon = `https://bungie.net${itemDefinitions[item].displayProperties.icon}`
    const sandboxPerks = itemDefinitions[item].perks
    let description = itemDefinitions[item].displayProperties.description
    let sandboxPerkHash = undefined
    if (sandboxPerks && sandboxPerks.length > 0) {
      sandboxPerkHash = sandboxPerks[0].perkHash
    }

    if (type && type.endsWith("Mod") && description === "") {
      description = sandboxPerkDefinitions[sandboxPerkHash].displayProperties.description
    }

    if (type && type.endsWith("Mod")) {
      output[item] = {
        name,
        type,
        description,
        icon
      }
    }
  }

  return output
}

module.exports.printNewCachedMods = async () => {
  const data = await this.buildCachedMods()
  console.log(JSON.stringify(data, null, "  "))
}
