/** @typedef {import('./animalIdentifier.js').AnimalIdentifier} AnimalIdentifier */
/** @typedef {import('./breedCode.js').BreedCode} BreedCode */
/** @typedef {import('./animalDetailSource.js').AnimalDetailSource} AnimalDetailSource */
/** @typedef {import('./animalLocation.js').AnimalLocation} AnimalLocation */
/** @typedef {import('./parentage.js').Parentage} Parentage */

/**
 * @typedef {object} AnimalDetail
 * @property {string} resourceType?
 * @property {AnimalIdentifier} identifier?
 * @property {string} species?
 * @property {string} sex?
 * @property {string} birthDate?
 * @property {string} registrationDate?
 * @property {string} dateOnCPH?
 * @property {AnimalLocation} currentLocation?
 * @property {AnimalLocation} registeredLocation?
 * @property {AnimalLocation} deathLocation?
 * @property {BreedCode} breedCode?
 * @property {Parentage} parentage?
 * @property {string} state?
 * @property {string} restrictionStatus?
 */
