/* eslint-env mocha */
import chai, {expect} from 'chai'
import oco from 'opencolor'
import {createTransformer} from '../src/factory'
import fs from 'fs'
import path from 'path'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

const testTransformer = createTransformer({}, (tree, options) => {
  return new Promise((resolve, reject) => {
    tree.transformEntries((entry) => {
      entry.name = entry.name + ' - transformed'
    })
    resolve(tree)
  })
})

describe('Transformer Factory', () => {
  const simplePaletteOcoString = fs.readFileSync(path.join(__dirname, 'fixtures', 'simple-palette.oco'))
  describe('Configurable Transformer', () => {
    it('should be configurabel', () => {
      var configuredTransformer = testTransformer.configure({})
      expect(configuredTransformer(oco.parse('colorA: #FFF'))).to.be.fullfilled
    })
    it('should be configurabel with options', () => {
      var configuredTransformer = testTransformer.configure({scope: 'XXX'})
      expect(configuredTransformer(oco.parse('colorA: #FFF'))).to.be.rejectedWith(Error)
    })
  })
  describe('Scoping and Filters', () => {
    it('should allow scoping on Color, Palette and Reference', () => {
      return Promise.all([
        expect(testTransformer(oco.parse('colorA: #FFF'), {scope: 'Color'})).to.be.fullfilled,
        expect(testTransformer(oco.parse('colorA: #FFF'), {scope: 'Palette'})).to.be.fullfilled,
        expect(testTransformer(oco.parse('colorA: #FFF'), {scope: 'Reference'})).to.be.fullfilled
      ])
    })
    it('should allow multiple scoping', () => {
      return expect(testTransformer(oco.parse('colorA: #FFF'), {scope: ['Color', 'Palette']})).to.be.fullfilled
    })
    it('should reject unknown scoping options', () => {
      return expect(testTransformer(oco.parse('colorA: #FFF'), {scope: 'XXX'})).to.be.rejectedWith(Error)
    })
    it('should filter entry names with string', () => {
      const tree = oco.parse(simplePaletteOcoString)
      return testTransformer(tree, {
        filter: 'colorname'
      }).then((transformed) => {
        expect(transformed.get('palettenameA')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameA - transformed')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameB - transformed')).to.not.be.undefined
      })
    })
    it('should filter entry names with regexp', () => {
      const tree = oco.parse(simplePaletteOcoString)
      return testTransformer(tree, {
        filter: /colorname[AB]/
      }).then((transformed) => {
        expect(transformed.get('palettenameA')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameA - transformed')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameB - transformed')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameC')).to.not.be.undefined
      })
    })
    it('should only effect entries inside the scope', () => {
      const tree = oco.parse(simplePaletteOcoString)
      return testTransformer(tree, {
        scope: ['Color']
      }).then((transformed) => {
        expect(transformed.get('palettenameA')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameA - transformed')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameB - transformed')).to.not.be.undefined
      })
    })
    it('should support enforcedOptions', () => {
      const tree = oco.parse(simplePaletteOcoString)

      const testTransformerWithEnforcedScope = createTransformer({}, {scope: ['Color']}, (tree, options) => {
        return new Promise((resolve, reject) => {
          tree.transformEntries((entry) => {
            entry.name = entry.name + ' - transformed'
          })
          resolve(tree)
        })
      })
      return testTransformerWithEnforcedScope(tree, {
        scope: ['Palette']
      }).then((transformed) => {
        expect(transformed.get('palettenameA')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameA - transformed')).to.not.be.undefined
        expect(transformed.get('palettenameA.colornameB - transformed')).to.not.be.undefined
      })
    })
  })
})
