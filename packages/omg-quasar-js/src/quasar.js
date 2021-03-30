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

const txUtils = require('./txUtils');
const { transaction } = require('@omisego/omg-js-util');
const erc20abi = require('human-standard-token-abi');
const ethUtil = require('ethereumjs-util');
const quasarAbi = require('./contracts/Quasar.json');

class Quasar {
    constructor({ web3, quasarContractAddress }) {
        this.web3 = web3;
        this.quasar = getContract(web3, quasarAbi.abi, quasarContractAddress)
    }

    async bondValue() {
        return this.quasar.methods.bondValue().call();
    }
    
    async safeBlockMargin() {
    return this.quasar.methods.safeBlockMargin().call();
    }

    async quasarOwner() {
    return this.quasar.methods.quasarOwner().call();
    }

    async obtainTicket({
        utxoPos,
        rlpOutputCreationTx,
        outputCreationTxInclusionProof,
        txOptions,
    }) {
        const bondValue = await this.bondValue();
        const data = this.quasar.methods.obtainTicket(
          utxoPos,
          rlpOutputCreationTx,
          outputCreationTxInclusionProof,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          value: bondValue,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async claim({
        utxoPos,
        utxoPosQuasarOwner,
        rlpTxToQuasarOwner,
        txToQuasarOwnerInclusionProof,
        txOptions,
    }) {
        const data = this.quasar.methods.claim(
          utxoPos,
          utxoPosQuasarOwner,
          rlpTxToQuasarOwner,
          txToQuasarOwnerInclusionProof,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async ifeClaim({
        utxoPos,
        inFlightClaimTx,
        txOptions,
    }) {
        const data = this.quasar.methods.ifeClaim(
          utxoPos,
          inFlightClaimTx,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async challengeIfeClaim({
        utxoPos,
        rlpChallengeTx,
        challengeTxInputIndex,
        challengeTxWitness,
        otherInputIndex,
        otherInputCreationTx,
        txOptions,
    }) {
        const data = this.quasar.methods.challengeIfeClaim(
          utxoPos,
          rlpChallengeTx,
          challengeTxInputIndex,
          challengeTxWitness,
          otherInputIndex,
          otherInputCreationTx,
          ethUtil.keccak256(txOptions.from)
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async processIfeClaim({
        utxoPos,
        txOptions,
    }) {
        const data = this.quasar.methods.processIfeClaim(
          utxoPos,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async addEthCapacity({
        value,
        txOptions,
    }) {
        const data = this.quasar.methods.addEthCapacity().encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          value,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async approveToken({
        erc20Address,
        amount,
        txOptions,
    }) {
        const erc20Contract = getContract(this.web3, erc20abi, erc20Address);
        const spender = this.quasar.options.address;
    
        const txDetails = {
          from: txOptions.from,
          to: erc20Address,
          data: erc20Contract.methods.approve(spender, amount.toString()).encodeABI(),
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async addTokenCapacity({
        token,
        amount,
        txOptions,
    }) {
        const data = this.quasar.methods.addTokenCapacity(
          token,
          amount,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async withdrawFunds({
        token,
        amount,
        txOptions,
    }) {
        const data = this.quasar.methods.withdrawFunds(
          token,
          amount,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async repayOwedToken({
        amount,
        currency = transaction.ETH_CURRENCY,
        txOptions,
    }) { 
        const isEth = currency === transaction.ETH_CURRENCY;
        const _amount = amount.toString()
        const data = this.quasar.methods.repayOwedToken(
          currency,
          amount,
        ).encodeABI();
    
        const txDetails = {
          from: txOptions.from,
          to: this.quasar.options.address,
          data,
          ...isEth ? { value: _amount } : {},
          gas: txOptions.gas,
          gasPrice: txOptions.gasPrice,
        };
    
        return txUtils.sendTx({
          web3: this.web3,
          txDetails,
          privateKey: txOptions.privateKey,
        });
    }

    async getQTokenBalance({ erc20Address = transaction.ETH_CURRENCY, supplierAddress }) {
        const tokenData =  await this.quasar.methods.tokenData(erc20Address).call();
        const qTokenAddressIndex = 0;
        const qTokenContract = getContract(this.web3, erc20abi, tokenData[qTokenAddressIndex]);
        return qTokenContract.methods.balanceOf(supplierAddress).call();
    }

    async getQuasarFee(erc20Address = transaction.ETH_CURRENCY) {
        const tokenData =  await this.quasar.methods.tokenData(erc20Address).call();
        const quasarFeeIndex = 4;
        return tokenData[quasarFeeIndex];
    }


}

function getContract (web3, abi, address) {
    const isLegacyWeb3 = web3.version.api && web3.version.api.startsWith('0.2')
    if (isLegacyWeb3) {
      return web3.eth.contract(abi).at(address)
    }
    return new web3.eth.Contract(abi, address)
}

module.exports = Quasar;
