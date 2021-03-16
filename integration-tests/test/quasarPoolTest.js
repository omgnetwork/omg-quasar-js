/*
Copyright 2019 OmiseGO Pte Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

const Web3 = require('web3');
const ChildChain = require('@omisego/omg-js-childchain');
const RootChain = require('@omisego/omg-js-rootchain');
const { transaction } = require('@omisego/omg-js-util');
const chai = require('chai');
const numberToBN = require('number-to-bn');
const promiseRetry = require('promise-retry');
const path = require('path');
const config = require('../test-config');
const rcHelper = require('../helpers/rootChainHelper');
const faucet = require('../helpers/faucet');
const ccHelper = require('../helpers/childChainHelper');
const Quasar = require('../../packages/omg-quasar-js/src/quasar');

const { assert } = chai;
const faucetName = path.basename(__filename);
const POLL_INTERVAL = 3000;

describe('Quasar Pool test', () => {
  const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_node));
  const rootChain = new RootChain({
    web3,
    plasmaContractAddress: config.plasmaframework_contract_address,
  });
  const childChain = new ChildChain({
    watcherUrl: config.watcher_url,
    watcherProxyUrl: config.watcher_proxy_url,
    plasmaContractAddress: config.plasmaframework_contract_address,
  });

  const quasar = new Quasar({
      web3, 
      quasarContractAddress: config.quasar_contract_address,
  });

  before(async () => {
    await faucet.init({
      rootChain, childChain, web3, config, faucetName,
    });
  });

  describe('When the pool is supplied', () => {
    const ALICE_SUPPLY_AMOUNT = web3.utils.toWei('.5', 'ether');

    let aliceAccount;

    before(async () => {
      aliceAccount = rcHelper.createAccount(web3);

      await Promise.all([
        // Give some ETH to Alice on the root chain
        faucet.fundRootchainEth(aliceAccount.address, ALICE_SUPPLY_AMOUNT),
      ]);

      // Wait for finality
      await Promise.all([
        rcHelper.waitForEthBalanceEq(
          web3,
          aliceAccount.address,
          ALICE_SUPPLY_AMOUNT,
        ),
      ]);
    });

    after(async () => {
      try {
        await faucet.returnFunds(aliceAccount);
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`);
      }
    });

    it('should add to pool supply', async () => {
      const aliceQEthBalanceBeforeSupply = await quasar.getQTokenBalance({ supplierAddress: aliceAccount.address});

      // Provide liquidity to the quasar
      await quasar.addEthCapacity({
          value: ALICE_SUPPLY_AMOUNT / 2,
          txOptions: {
            from: aliceAccount.address,
            privateKey: aliceAccount.privateKey,
          }
      });

      this.aliceQEthBalanceAfterSupply = await quasar.getQTokenBalance({ supplierAddress: aliceAccount.address});

      assert.isTrue(this.aliceQEthBalanceAfterSupply > aliceQEthBalanceBeforeSupply);
    });

    describe('When the fund is withdrawn', () => {
      before(async () => {
        const ETH = '0x0000000000000000000000000000000000000000';
        await quasar.withdrawFunds({
          token: ETH,
          amount: this.aliceQEthBalanceAfterSupply,
          txOptions: {
            from: aliceAccount.address,
            privateKey: aliceAccount.privateKey,
          }
        })
      });

      it('should withdraw from supply', async () => {
          const aliceQEthBalanceAfterWithdraw = await quasar.getQTokenBalance({ supplierAddress: aliceAccount.address});
          assert.equal(aliceQEthBalanceAfterWithdraw, 0);
      });
    });
  });
});
