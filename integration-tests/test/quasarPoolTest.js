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
const chai = require('chai');
const path = require('path');
const config = require('../test-config');
const rcHelper = require('../helpers/rootChainHelper');
const faucet = require('../helpers/faucet');
const Quasar = require('@omisego/omg-quasar-js');

const { assert } = chai;
const faucetName = path.basename(__filename);

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

  describe('When the pool is supplied ETH', () => {
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

  describe('When the pool is supplied ERC20', function () {
    const INTIIAL_ALICE_AMOUNT_ETH = web3.utils.toWei('.1', 'ether')
    const ALICE_AMOUNT_ERC20 = 3
    const TEST_AMOUNT = 2

    let aliceAccount

    before(async function () {
      aliceAccount = rcHelper.createAccount(web3)
      await faucet.fundRootchainEth(aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH)
      await faucet.fundRootchainERC20(aliceAccount.address, ALICE_AMOUNT_ERC20)

      await Promise.all([
        rcHelper.waitForEthBalanceEq(web3, aliceAccount.address, INTIIAL_ALICE_AMOUNT_ETH),
        rcHelper.waitForERC20BalanceEq(web3, aliceAccount.address, config.erc20_contract_address, ALICE_AMOUNT_ERC20)
      ])
    })

    after(async function () {
      try {
        await faucet.returnFunds(aliceAccount)
      } catch (err) {
        console.warn(`Error trying to return funds to the faucet: ${err}`)
      }
    })

    it('should deposit ERC20 tokens to the Plasma contract', async function () {
      // The new account should have no initial balance
      const initialBalance = await childChain.getBalance(aliceAccount.address)
      assert.equal(initialBalance.length, 0)

      // Account must approve the Quasar contract
      await quasar.approveToken({
        erc20Address: config.erc20_contract_address,
        amount: TEST_AMOUNT,
        txOptions: {
          from: aliceAccount.address,
          privateKey: aliceAccount.privateKey
        }
      })

      const aliceQTokenBalanceBeforeSupply = await quasar.getQTokenBalance({
        erc20Address: config.erc20_contract_address,
        supplierAddress: aliceAccount.address,
      });

      // Provide liquidity to the quasar
      await quasar.addTokenCapacity({
          token: config.erc20_contract_address,
          amount: TEST_AMOUNT,
          txOptions: {
            from: aliceAccount.address,
            privateKey: aliceAccount.privateKey,
          }
      });

      const aliceQTokenBalanceAfterSupply = await quasar.getQTokenBalance({
        erc20Address: config.erc20_contract_address,
        supplierAddress: aliceAccount.address,
      });

      assert.isTrue(aliceQTokenBalanceAfterSupply > aliceQTokenBalanceBeforeSupply);
    });

    describe('When the erc20 fund is withdrawn', () => {
      before(async () => {
        const aliceQTokenBalanceAfterSupply = await quasar.getQTokenBalance({
          erc20Address: config.erc20_contract_address,
          supplierAddress: aliceAccount.address,
        });

        await quasar.withdrawFunds({
          token: config.erc20_contract_address,
          amount: aliceQTokenBalanceAfterSupply,
          txOptions: {
            from: aliceAccount.address,
            privateKey: aliceAccount.privateKey,
          }
        })
      });

      it('should withdraw from supply', async () => {
          const aliceQTokenBalanceAfterWithdraw = await quasar.getQTokenBalance({
            erc20Address: config.erc20_contract_address,
            supplierAddress: aliceAccount.address,
          });

          assert.equal(aliceQTokenBalanceAfterWithdraw, 0);
      });
    });
  });
});
