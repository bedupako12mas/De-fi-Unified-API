import { BaseAdapter }    from '../base.js'
import { AaveV3Pool }     from './Pool.js'
import { AAVE_V3_CONFIG } from './config.js'

export class AaveV3Adapter extends BaseAdapter {
  constructor() {
    super()
    this.registerContract('Pool', new AaveV3Pool())
  }

  supportedNetworks(): string[] {
    return Object.keys(AAVE_V3_CONFIG)
  }
}
