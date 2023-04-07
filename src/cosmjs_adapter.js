"use strict";

class CosmJSOfflineSigner {
  constructor(chainId, foxwallet) {
    this.chainId = chainId;
    this.foxwallet = foxwallet;
  }
  async getAccounts() {
    const key = await this.foxwallet.getKey(this.chainId);
    return [
      {
        address: key.bech32Address,
        algo: "secp256k1",
        pubkey: key.pubKey,
      },
    ];
  }

  async signAmino(signerAddress, signDoc) {
    if (this.chainId !== signDoc.chain_id) {
      throw new Error("Unmatched chain id with the offline signer");
    }
    const key = await this.foxwallet.getKey(signDoc.chain_id);
    if (key.bech32Address !== signerAddress) {
      throw new Error("Unknown signer address");
    }
    return await this.foxwallet.signAmino(
      this.chainId,
      signerAddress,
      signDoc,
      {}
    );
  }

  async sign(signerAddress, signDoc) {
    return await this.signAmino(signerAddress, signDoc);
  }

  async signDirect(signerAddress, signDoc) {
    if (this.chainId !== signDoc.chainId) {
      throw new Error("Unmatched chain id with the offline signer");
    }
    const key = await this.foxwallet.getKey(signDoc.chainId);
    if (key.bech32Address !== signerAddress) {
      throw new Error("Unknown signer address");
    }
    return await this.foxwallet.signDirect(
      this.chainId,
      signerAddress,
      signDoc
    );
  }
}

module.exports = CosmJSOfflineSigner;
