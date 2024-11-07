import "./App.css";
import Web3 from "web3";
import { useState, useEffect, useCallback } from "react";
import detectEthereumProvider from "@metamask/detect-provider";
import "bulma/css/bulma.css";
import MyContract from "./public/contracts/Faucet.json";

function App() {
  const [balance, setBalance] = useState("0");
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState();
  const [web3Api, setWeb3Api] = useState({
    provider: null,
    web3: null,
    contract: null,
    isProviderLoaded: false,
    chainId: null,
    isChainIdChanged: false,
  });
  const [error, setError] = useState("");
  const [shouldReload, reload] = useState(false);
  const reloadEffect = useCallback(() => reload(!shouldReload), [shouldReload]);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      console.log("please connect to metamask");
    } else {
      console.log("Account changed", accounts);
    }
  };

  const handleChainChanged = (chainId) => {
    console.log("Chain changed to: ", chainId);
  };

  useEffect(() => {
    const loadProvider = async () => {
      const provider = await detectEthereumProvider();

      if (provider) {
        const web3 = new Web3(provider);
        const networkId = await web3.eth.net.getId();

        if (networkId !== 5777n) {
          setError("Please connect to the Ganache Network");
          return;
        }

        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);

        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("chainChanged", handleChainChanged);

        provider.setMaxListeners(20);

        setWeb3Api({
          web3: new Web3(provider),
          provider,
          contract: new web3.eth.Contract(
            MyContract.abi,
            "0xE53461a555925ebFB8D437E6A37716B53d47354b"
          ),
          isProviderLoaded: true,
          chainId: networkId,
          isChainIdChanged: true,
        });

        return () => {
          const provider = web3Api.provider;

          if (provider) {
            provider.removeListener("accountsChanged", handleAccountsChanged);
            provider.removeListener("chainChanged", handleChainChanged);
          }
        };
      } else {
        setWeb3Api((api) => ({
          ...api,
          isProviderLoaded: true,
        }));
        console.error("Please, Install Metamask wallet.");
      }
    };
    loadProvider();
  }, [web3Api.chainId, web3Api.isChainIdChanged]);

  useEffect(() => {
    const getAccount = async () => {
      try {
        const accounts = await web3Api.web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setConnected(true);
          // Fetch balance after connecting
          const balance = await web3Api.web3.eth.getBalance(accounts[0]);
          setBalance(web3Api.web3.utils.fromWei(balance, "ether"));
        }
      } catch (err) {
        setError(err.message);
      }
    };

    web3Api.web3 && getAccount();
  }, [web3Api.web3, reloadEffect, web3Api.chainId]);

  const connectionAccount = async () => {
    setError("");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } catch (err) {
      setError(err.message);
    }
  };

  const donate = async () => {
    setError("");
    try {
      if (!web3Api.contract) {
        throw new Error("Contract is not loaded.");
      }

      const amountInWei = web3Api.web3.utils.toWei("0.1", "ether");

      await web3Api.contract.methods.donate(amountInWei).send({
        from: account,
        value: amountInWei,
      });

      reloadEffect();
    } catch (err) {
      if (err.message.includes("User denied transaction signature")) {
        setError("Transaction is canceled!");
      } else {
        setError("Donation failed: " + err.message);
      }
    }
  };

  const withdraw = async () => {
    if (!web3Api.web3 || !web3Api.contract) {
      setError("Web3 or contract is not initialized properly.");
      return;
    }

    try {
      if (!web3Api.provider) {
        throw new Error("there's no wallet to withdraw to!");
      }

      const amountInWei = web3Api.web3.utils.toWei("0.1", "ether");
      const gasEstimate = await web3Api.contract.methods
        .withdraw(amountInWei)
        .estimateGas({ from: account });

      const tx = await web3Api.contract.methods.withdraw(amountInWei).send({
        from: account,
        gas: gasEstimate,
      });

      console.log("Withdrawal successful: ", tx);

      reloadEffect();
    } catch (err) {
      if (
        err.message.includes(
          "MetaMask Tx Signature: User denied transaction signature."
        )
      ) {
        setError("Transaction is canceled!");
      }
      setError("Withdraw failed: " + "Insufficient contract balance");
    }
  };

  return (
    <header className="is-fullwidth is-flex" style={{ marginTop: "12%" }}>
      <div className="is-flex is-flex-direction-column mx-auto mt-5">
        {web3Api.isProviderLoaded ? (
          <div className="is-flex" style={{ flexDirection: "column" }}>
            <div
              className="text-5xl is-flex is-align-items-start"
              style={{ gap: "5px", flexDirection: "column" }}
            >
              {!account && (
                <div className="mr-2 is-flex" style={{ gap: "7px" }}>
                  <button
                    onClick={connectionAccount}
                    className="is-size-7 is-dark has-text-white button p-1 pr-5 pl-5"
                  >
                    {connected ? "Connected" : "Connect"}
                  </button>
                </div>
              )}
              {!account && !web3Api.provider ? (
                <>
                  <div className="notification is-danger">
                    please install the metamask to continue,
                    <a href="https://metamask.io/"> install</a>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="has-text-info-light">Ethereum Wallet:</h1>
                  <small className="text-lg">{account}</small>
                </>
              )}
            </div>
            <span className="is-flex text-5xl font-mono">
              <strong>Current balance: {balance} ETH</strong>
            </span>
          </div>
        ) : (
          <div>looking for web3...</div>
        )}
        {error && (
          <div className="notification is-danger">
            <strong>Error: {error}</strong>
          </div>
        )}
        <div className="is-flex columns is-variable is-3 font-light flex flex-row p-5">
          <div className="ml-2">
            <button
              disabled={!account}
              onClick={donate}
              className="is-size-5 button is-link p-1 pr-5 pl-5"
            >
              Donate 0.1ETH
            </button>
          </div>
          <div className="ml-2">
            <button
              disabled={!account}
              onClick={withdraw}
              className="is-size-5 button is-dark p-1 pr-5 pl-5"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default App;
