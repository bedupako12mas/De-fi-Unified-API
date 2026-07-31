import { BaseAdapter }        from '../base.js'
import { UniswapV3QuoterV2 }  from './QuoterV2.js'
import { UNISWAP_V3_CONFIG }  from './config.js'

export class UniswapV3Adapter extends BaseAdapter {
  constructor() {
    super()
    this.registerContract('QuoterV2', new UniswapV3QuoterV2())
  }

  supportedNetworks(): string[] {
    return Object.keys(UNISWAP_V3_CONFIG)
  }
}
