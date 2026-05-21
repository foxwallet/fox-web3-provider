"use strict";

import RPCServer from "./rpc";
import ProviderRpcError from "./error";
import Utils from "./utils";
import IdMapping from "./id_mapping";
import isUtf8 from "isutf8";
import { TypedDataUtils, SignTypedDataVersion } from "@metamask/eth-sig-util";
import BaseProvider from "./base_provider";
import { ErrorMap } from "./constants";

export const NETWORK_TYPES = {
  livenet: "livenet",
  testnet: "testnet",
};

class FoxQtumProvider extends BaseProvider {
  constructor(config) {
    super(config);

    this.isFoxWallet = true;
    this.chain = "QTUM";
    this.idMapping = new IdMapping();
    this.callbacks = new Map();
    this.wrapResults = new Map();
    this.setConfig(config);

    this.emitConnect(this.chainId);
  }

  setConfig(config) {
    const qtumConfig = config[this.chain];
    this.setBtcConfig(qtumConfig.BTC);
    this.setEthConfig(qtumConfig.ETH);
    this.isDebug = !!config.isDebug;
    this.config = qtumConfig;
  }

  setBtcConfig(config) {
    const { address, publicKey, network } = config;
    if (address && publicKey) {
      this.btcAddress = address;
      this.btcPublicKey = publicKey;
      this.btcReady = true;
    } else {
      this.btcAddress = null;
      this.btcPublicKey = null;
      this.btcReady = false;
    }
    this.network = network;
  }

  setEthConfig(config) {
    const { address, chainId, rpcUrl } = config;
    this.setEthAddress(address);
    this.networkVersion = "" + chainId;
    this.chainId = "0x" + (chainId || 81).toString(16);
    this.rpc = new RPCServer(rpcUrl);
  }

  setEthAddress(address) {
    const lowerAddress = (address || "").toLowerCase();
    this.ethAddress = lowerAddress;
    this.ethReady = true;
    try {
      for (var i = 0; i < window.frames.length; i++) {
        const frame = window.frames[i];
        if (frame.qtum && frame.qtum.isFoxWallet) {
          frame.qtum.ethAddress = lowerAddress;
          frame.qtum.ethReady = !!address;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  // eth = {
  //   isMetaMask: this.isMetaMask,
  //   isConnected: this.isConnected,
  //   request: this.request,
  //   on: this.on,
  //
  //   setAddress: this.setAddress,
  //   setConfig: this.setConfig,
  //   enable: this.enable,
  //   send: this.send,
  //   sendAsync: this.sendAsync,
  //
  //   personal_sign: this.personal_sign,
  //   personal_ecRecover: this.personal_ecRecover,
  //   eth_signTypedData: this.eth_signTypedData,
  //   eth_sendTransaction: this.eth_sendTransaction,
  //   eth_requestAccounts: this.eth_requestAccounts,
  //   wallet_watchAsset: this.wallet_watchAsset,
  //   wallet_addEthereumChain: this.wallet_addEthereumChain,
  //   wallet_switchEthereumChain: this.wallet_switchEthereumChain,
  // };

  //====================================
  //====================================
  //===== unisat like btc provider =====
  //====================================
  //====================================
  async assertConnected() {
    if (!this.btcReady) {
      throw new ProviderRpcError(ErrorMap.Unauthorized);
    }
    // await this.getAccounts();
    // if (!this.btcReady) {
    //   await this.sendPromise("btc_requestAccounts");
    // }
  }

  async requestAccounts() {
    if (this.btcAddress) {
      Utils.emitConnectEvent(this.chain, this.config, {
        address: this.btcAddress,
      });
      return [this.btcAddress];
    }
    let { address, publicKey } = await this.sendPromise("btc_requestAccounts");
    if ((address, publicKey)) {
      this.btcAddress = address;
      this.btcPublicKey = publicKey;
      this.btcReady = true;
      Utils.emitConnectEvent(this.chain, this.config, {
        address: this.btcAddress,
      });
      let evmaddress = Utils.getEvmAddress(address);
      this.setAddress(evmaddress);
    }
    return address ? [address] : [];
  }

  async getAccounts() {
    return this.btcAddress ? [this.btcAddress] : [];
    // let accounts = await this.sendPromise("btc_getAccounts");
    // if (accounts && accounts.length > 0) {
    //   this.ready = true;
    // }
    // return accounts;
  }

  async getPublicKey() {
    return this.btcPublicKey || "";
    // await this.assertConnected();
    // return this.sendPromise("btc_getPublicKey");
  }

  async getNetwork() {
    if (this.network) {
      return this.network;
    }
    return this.sendPromise("btc_getNetwork");
  }

  async switchNetwork(network) {
    return this.sendPromise("btc_switchNetwork", network);
  }

  async signMessage(message, option) {
    await this.assertConnected();
    return this.sendPromise("btc_signMessage", { message, option });
  }

  async getBalance() {
    await this.assertConnected();
    return this.sendPromise("btc_getBalance");
  }
  async getInscriptions(cursor, size) {
    await this.assertConnected();
    return this.sendPromise("btc_getInscriptions", { cursor, size });
  }
  async sendBitcoin(toAddress, satoshis, option) {
    await this.assertConnected();
    return this.sendPromise("btc_sendBitcoin", {
      toAddress,
      satoshis,
      option,
    });
  }
  async sendInscription(toAddress, inscriptionId, options) {
    await this.assertConnected();
    return this.sendPromise("btc_sendInscription", {
      toAddress,
      inscriptionId,
      options,
    });
  }
  async pushTx(rawtx) {
    return this.sendPromise("btc_pushTx", { rawtx });
  }
  async signPsbt(psbtHex, options) {
    await this.assertConnected();
    return this.sendPromise("btc_signPsbt", { psbtHex, options });
  }
  async signPsbts(psbtHexs, options) {
    await this.assertConnected();
    return this.sendPromise("btc_signPsbts", { psbtHexs, options });
  }
  async pushPsbt(psbtHex) {
    return this.sendPromise("btc_pushPsbt", psbtHex);
  }
  // method: 'inscribeTransfer',
  async inscribeTransfer(ticker, amount) {
    console.log("==> inscribeTransfer");
    return this.sendPromise("btc_inscribeTransfer", { ticker, amount });
  }

  networkChanged(network) {
    this.emit("networkChanged", network);
  }

  accountsChanged(addresses) {
    this.emit("accountsChanged", addresses);
  }

  accountChanged(addressInfo) {
    this.emit("accountChanged", addressInfo);
  }

  sendPromise(method, params) {
    // id: number;
    // name: string; // 方法名
    // object: any; // payload
    // chain: CoinType;
    const id = Utils.genId();
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
      this.postMessageBase(method, id, params);
    });
  }

  postMessageBase(handler, id, data) {
    let object = {
      id: id,
      name: handler,
      object: data,
      chain: this.chain,
    };
    if (window.foxwallet.postMessage) {
      window.foxwallet.postMessage(object);
    } else {
      console.error("postMessage is not available");
    }
  }

  btc = {
    requestAccounts: this.requestAccounts.bind(this),
    getAccounts: this.getAccounts.bind(this),
    getPublicKey: this.getPublicKey.bind(this),
    getNetwork: this.getNetwork.bind(this),
    switchNetwork: this.switchNetwork.bind(this),
    signMessage: this.signMessage.bind(this),
    getBalance: this.getBalance.bind(this),
    getInscriptions: this.getInscriptions.bind(this),
    sendBitcoin: this.sendBitcoin.bind(this),
    sendInscription: this.sendInscription.bind(this),
    pushTx: this.pushTx.bind(this),
    signPsbt: this.signPsbt.bind(this),
    signPsbts: this.signPsbts.bind(this),
    pushPsbt: this.pushPsbt.bind(this),
    inscribeTransfer: this.inscribeTransfer.bind(this),

    networkChanged: this.networkChanged.bind(this),
    accountsChanged: this.accountsChanged.bind(this),
  };

  //====================================
  //====================================
  //====================================
  //====================================
  //====================================

  request(payload) {
    // this points to window in methods like web3.eth.getAccounts()
    var that = this;
    if (!(this instanceof FoxQtumProvider)) {
      that = window.qtum;
    }
    return that._request(payload, false);
  }

  /**
   * @deprecated Listen to "connect" event instead.
   */
  isConnected() {
    return true;
  }

  /**
   * @deprecated Use request({method: "eth_requestAccounts"}) instead.
   */
  enable() {
    console.log(
      "enable() is deprecated, please use window.qtum.request({method: 'eth_requestAccounts'}) instead."
    );
    return this.request({ method: "eth_requestAccounts", params: [] });
  }

  /**
   * @deprecated Use request() method instead.
   */
  send(payload) {
    if (this.isDebug) {
      console.log(`==> send payload ${JSON.stringify(payload)}`);
    }
    let response = { jsonrpc: "2.0", id: payload.id };
    switch (payload.method) {
      case "eth_accounts":
        response.result = this.eth_accounts();
        break;
      case "eth_coinbase":
        response.result = this.eth_coinbase();
        break;
      case "net_version":
        response.result = this.net_version();
        break;
      case "eth_chainId":
        response.result = this.eth_chainId();
        break;
      default:
        throw new ProviderRpcError(
          4200,
          `Fox does not support calling ${payload.method} synchronously without a callback. Please provide a callback parameter to call ${payload.method} asynchronously.`
        );
    }
    return response;
  }

  /**
   * @deprecated Use request() method instead.
   */
  sendAsync(payload, callback) {
    console.log(
      "sendAsync(data, callback) is deprecated, please use window.qtum.request(data) instead."
    );
    // this points to window in methods like web3.eth.getAccounts()
    var that = this;
    if (!(this instanceof FoxQtumProvider)) {
      that = window.qtum;
    }
    if (Array.isArray(payload)) {
      Promise.all(payload.map((_payload) => that._request(_payload)))
        .then((data) => callback(null, data))
        .catch((error) => callback(error, null));
    } else {
      that
        ._request(payload)
        .then((data) => callback(null, data))
        .catch((error) => callback(error, null));
    }
  }

  /**
   * @private Internal rpc handler
   */
  _request(payload, wrapResult = true) {
    this.idMapping.tryIntifyId(payload);
    if (this.isDebug) {
      console.log(`==> _request payload ${JSON.stringify(payload)}`);
    }
    this.fillJsonRpcVersion(payload);
    return new Promise((resolve, reject) => {
      if (!payload.id) {
        payload.id = Utils.genId();
      }
      this.callbacks.set(payload.id, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
      this.wrapResults.set(payload.id, wrapResult);

      switch (payload.method) {
        case "eth_accounts":
          return this.sendResponse(payload.id, this.eth_accounts());
        case "eth_coinbase":
          return this.sendResponse(payload.id, this.eth_coinbase());
        case "net_version":
          return this.sendResponse(payload.id, this.net_version());
        case "eth_chainId":
          return this.sendResponse(payload.id, this.eth_chainId());
        case "btc_sign":
          throw new ProviderRpcError(
            4200,
            "Fox does not support btc_sign. Please use other sign method instead."
          );
        case "eth_sign":
          throw new ProviderRpcError(
            4200,
            "Fox does not support eth_sign. Please use other sign method instead."
          );
        case "personal_sign":
          return this.personal_sign(payload, false);
        case "personal_ecRecover":
          return this.personal_ecRecover(payload, false);
        case "eth_signTypedData_v3":
          return this.eth_signTypedData(
            payload,
            SignTypedDataVersion.V3,
            false
          );
        case "eth_signTypedData_v4":
          return this.eth_signTypedData(
            payload,
            SignTypedDataVersion.V4,
            false
          );
        case "eth_signTypedData":
          return this.eth_signTypedData(
            payload,
            SignTypedDataVersion.V1,
            false
          );
        case "btc_personalSign":
          return this.personal_sign(payload, true);
        case "btc_ecRecover":
          return this.personal_ecRecover(payload, true);
        case "btc_signTypedData_v3":
          return this.eth_signTypedData(payload, SignTypedDataVersion.V3, true);
        case "btc_signTypedData_v4":
          return this.eth_signTypedData(payload, SignTypedDataVersion.V4, true);
        case "btc_signTypedData":
          return this.eth_signTypedData(payload, SignTypedDataVersion.V1, true);
        case "eth_sendTransaction":
          return this.eth_sendTransaction(payload);
        case "eth_requestAccounts":
          return this.eth_requestAccounts(payload);
        case "wallet_watchAsset":
          return this.wallet_watchAsset(payload);
        case "wallet_addEthereumChain":
          return this.wallet_addEthereumChain(payload);
        case "wallet_switchEthereumChain":
          return this.wallet_switchEthereumChain(payload);
        case "eth_newFilter":
        case "eth_newBlockFilter":
        case "eth_newPendingTransactionFilter":
        case "eth_uninstallFilter":
        case "eth_subscribe":
          throw new ProviderRpcError(
            4200,
            `Fox does not support calling ${payload.method}. Please use your own solution`
          );
        case "eth_getTransactionByHash":
        case "eth_getTransactionByBlockNumberAndIndex":
        case "eth_getTransactionByBlockHashAndIndex":
          // call upstream rpc
          this.callbacks.delete(payload.id);
          this.wrapResults.delete(payload.id);
          payload.jsonrpc = "2.0";
          return this.rpc
            .call(payload)
            .then((response) => {
              if (response.result) {
                if (response.result.blockHash === "") {
                  response.result.blockHash = null;
                }

                if (response.result.blockNumber === "") {
                  response.result.blockNumber = null;
                }

                if (response.result.transactionIndex === "") {
                  response.result.transactionIndex = null;
                }
              }

              if (this.isDebug) {
                console.log(`<== rpc response ${JSON.stringify(response)}`);
              }
              wrapResult ? resolve(response) : resolve(response.result);
            })
            .catch(reject);
        default:
          // call upstream rpc
          this.callbacks.delete(payload.id);
          this.wrapResults.delete(payload.id);
          payload.jsonrpc = "2.0";
          return this.rpc
            .call(payload)
            .then((response) => {
              if (this.isDebug) {
                console.log(`<== rpc response ${JSON.stringify(response)}`);
              }
              wrapResult ? resolve(response) : resolve(response.result);
            })
            .catch(reject);
      }
    });
  }

  fillJsonRpcVersion(payload) {
    if (payload.jsonrpc === undefined) {
      payload.jsonrpc = "2.0";
    }
  }

  emitConnect(chainId) {
    this.emit("connect", { chainId: chainId });
  }

  emitChainChanged(chainId) {
    console.log("emitChainChanged", chainId);
    this.emit("chainChanged", chainId);
    this.emit("networkChanged", chainId);
  }

  eth_accounts() {
    if (this.ethAddress) {
      Utils.emitConnectEvent(this.chain, this.config, {
        address: this.ethAddress,
      });
    }
    return this.ethAddress ? [this.ethAddress] : [];
  }

  eth_coinbase() {
    return this.ethAddress;
  }

  net_version() {
    return this.networkVersion;
  }

  eth_chainId() {
    return this.chainId;
  }

  eth_sign(payload, btcSign) {
    const buffer = Utils.messageToBuffer(payload.params[1]);
    const hex = Utils.bufferToHex(buffer);
    if (isUtf8(buffer)) {
      this.postMessage("signPersonalMessage", payload.id, {
        data: hex,
        btcSign,
      });
    } else {
      this.postMessage("signMessage", payload.id, { data: hex, btcSign });
    }
  }

  personal_sign(payload, btcSign) {
    const firstParam = payload.params[0];
    const secondParam = payload.params[1];
    let message = firstParam;
    if (
      Utils.resemblesAddress(firstParam) &&
      !Utils.resemblesAddress(secondParam)
    ) {
      message = secondParam;
    }
    const buffer = Utils.messageToBuffer(message);
    if (buffer.length === 0) {
      // hex it
      const hex = Utils.bufferToHex(message);
      this.postMessage("signPersonalMessage", payload.id, {
        data: hex,
        btcSign,
      });
    } else {
      this.postMessage("signPersonalMessage", payload.id, {
        data: message,
        btcSign,
      });
    }
  }

  personal_ecRecover(payload, btcSign) {
    this.postMessage("ecRecover", payload.id, {
      signature: payload.params[1],
      message: payload.params[0],
      from: payload.params[2],
      btcSign,
    });
  }

  eth_signTypedData(payload, version, btcSign) {
    let address;
    let data;

    const firstParam = payload.params[0];
    const secondParam = payload.params[1];
    if (
      Utils.resemblesAddress(firstParam) &&
      !Utils.resemblesAddress(secondParam)
    ) {
      data = payload.params[1];
      address = payload.params[0];
    } else {
      data = payload.params[0];
      address = payload.params[1];
    }

    const message = typeof data === "string" ? JSON.parse(data) : data;

    const { chainId } = message.domain || {};

    if (!!chainId && Number(chainId) !== Number(this.chainId)) {
      throw new Error(
        "Provided chainId does not match the currently active chain"
      );
    }

    const hash =
      version !== SignTypedDataVersion.V1
        ? TypedDataUtils.eip712Hash(message, version)
        : "";

    const SIGN_TYPED_MESSAGE = "signTypedMessage";
    const SIGN_TYPED_MESSAGE_V1 = "signTypedMessageV1";
    const SIGN_TYPED_MESSAGE_V3 = "signTypedMessageV3";
    const SIGN_TYPED_MESSAGE_V4 = "signTypedMessageV4";

    let method = "signTypedMessage";
    switch (version) {
      case SignTypedDataVersion.V1:
        method = SIGN_TYPED_MESSAGE_V1;
        break;
      case SignTypedDataVersion.V3:
        method = SIGN_TYPED_MESSAGE_V3;
        break;
      case SignTypedDataVersion.V4:
        method = SIGN_TYPED_MESSAGE_V4;
        break;
      default:
        method = SIGN_TYPED_MESSAGE;
        break;
    }
    this.postMessage(method, payload.id, {
      data: "0x" + hash.toString("hex"),
      raw: typeof data === "string" ? data : JSON.stringify(data),
      address,
      version,
      btcSign,
    });
  }

  eth_sendTransaction(payload) {
    this.postMessage("signTransaction", payload.id, payload.params[0]);
  }

  eth_requestAccounts(payload) {
    this.postMessage("requestAccounts", payload.id, {});
  }

  wallet_watchAsset(payload) {
    let options = payload.params.options;
    this.postMessage("watchAsset", payload.id, {
      type: payload.params.type,
      contract: options.address,
      symbol: options.symbol,
      decimals: options.decimals || 0,
      image: options.image || "",
    });
  }

  wallet_addEthereumChain(payload) {
    this.postMessage("addEthereumChain", payload.id, payload.params[0]);
  }

  wallet_switchEthereumChain(payload) {
    this.postMessage("switchEthereumChain", payload.id, payload.params[0]);
  }

  /**
   * @private Internal js -> native message handler
   */
  postMessage(handler, id, data) {
    console.log("====> hander: ", handler);
    if (
      this.ethReady ||
      handler === "requestAccounts" ||
      handler === "switchEthereumChain"
    ) {
      let object = {
        id: id,
        name: handler,
        object: data,
        chain: this.chain,
      };
      if (window.foxwallet.postMessage) {
        window.foxwallet.postMessage(object);
      } else {
        // old clients
        window.webkit.messageHandlers[handler].postMessage(object);
      }
    } else {
      // don't forget to verify in the app
      this.sendError(id, "provider is not ready", 4100);
    }
  }

  /**
   * @private Internal native result -> js
   */
  sendResponse(id, result) {
    let originId = this.idMapping.tryPopId(id) || id;
    let callback = this.callbacks.get(id);
    let wrapResult = this.wrapResults.get(id);
    let data = { jsonrpc: "2.0", id: originId };
    if (
      result !== null &&
      typeof result === "object" &&
      result.jsonrpc &&
      result.result
    ) {
      data.result = result.result;
    } else {
      data.result = result;
    }
    if (this.isDebug) {
      console.log("<== wrapResult: ", wrapResult);
      console.log(
        `<== sendResponse id: ${id}, result: ${JSON.stringify(
          result
        )}, data: ${JSON.stringify(data)}`
      );
    }
    if (callback) {
      wrapResult ? callback(null, data) : callback(null, result);
      this.callbacks.delete(id);
    } else {
      console.log(`callback id: ${id} not found`);
      // check if it's iframe callback
      for (var i = 0; i < window.frames.length; i++) {
        const frame = window.frames[i];
        try {
          if (frame.qtum.callbacks.has(id)) {
            frame.qtum.sendResponse(id, result);
          }
        } catch (error) {
          console.log(`send response to frame error: ${error}`);
        }
      }
    }
  }

  sendError(id, message, code) {
    if (typeof message !== "string") {
      console.warn("sendError now takes string message and code");
      return;
    }
    let callback = this.callbacks.get(id);
    if (callback) {
      callback(new ProviderRpcError(code, message));
      this.callbacks.delete(id);
    }
  }

  emit(event, ...args) {
    console.log(`=== emit event ${event} ${args}`);
    super.emit(event, ...args);
  }
}

module.exports = FoxQtumProvider;
