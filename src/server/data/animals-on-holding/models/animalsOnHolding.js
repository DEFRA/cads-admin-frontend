/** @typedef {import('./animalSummary.js').AnimalSummary} AnimalSummary */
/** @typedef {import('./holdingIdentifier.js').HoldingIdentifier} HoldingIdentifier */

/**
 * @typedef {object} AnimalsOnHolding
 * @property {string} resourceType?
 * @property {HoldingIdentifier} CPH?
 * @property {string} LocationName?
 * @property {Array<AnimalSummary>} animals
 * @property {number} totalRecords
 * @property {number} page
 * @property {number} pageSize
 */
