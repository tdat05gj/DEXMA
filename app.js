document.addEventListener("DOMContentLoaded", () => {
    // Wait a bit for all elements to be ready
    setTimeout(initializeApp, 100);
});

function initializeApp() {
    const connectWalletBtn = document.getElementById("connectWallet");
    const mintButton = document.getElementById("mintButton");
    const mintForm = document.getElementById("mintForm");
    const recipientInput = document.getElementById("recipientAddress");
    const walletAddressSpan = document.getElementById("walletAddress");
    const balanceSpan = document.getElementById("balance");
    const statusDiv = document.getElementById("status");
    
    // Balance display elements
    const ethBalanceSpan = document.getElementById("ethBalance");
    const gjBalanceSpan = document.getElementById("gjBalance");
    const balanceDisplay = document.querySelector(".balance-display");

    // Debug: Check if elements exist
    console.log("Element check:");
    console.log("ethBalanceSpan:", ethBalanceSpan);
    console.log("gjBalanceSpan:", gjBalanceSpan);
    console.log("balanceDisplay:", balanceDisplay);
    console.log("connectWalletBtn:", connectWalletBtn);

    let provider, signer, contract, userAddress;

    // Contract configuration
    // GJ Token contract address on Doma Testnet
    const contractAddress = "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E";
    const mintFee = ethers.utils.parseEther("0.000666");
    const contractABI = [
        "function mint(address to) public payable",
        "function balanceOf(address owner) public view returns (uint256)",
        "function name() public view returns (string)",
        "function decimals() public view returns (uint8)"
    ];

    // Debug: Check if connect button exists
    if (!connectWalletBtn) {
        console.error("Connect wallet button not found!");
        return;
    }
    
    console.log("Connect wallet button found:", connectWalletBtn);
    
    // Test button click
    connectWalletBtn.addEventListener("mousedown", () => {
        console.log("Connect button mousedown event triggered");
    });
    
    connectWalletBtn.addEventListener("mouseup", () => {
        console.log("Connect button mouseup event triggered");
    });
    
    // Utility function to show status
    function showStatus(message, type = "") {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        } else {
            console.log(`Status: ${message} (${type})`);
        }
    }
    
    // Check if wallet is already connected
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            console.log("Account changed:", accounts);
            if (accounts.length === 0) {
                // User disconnected wallet
                userAddress = null;
                provider = null;
                signer = null;
                contract = null;
                showStatus("Wallet disconnected", "error");
                await updateWalletUI();
            } else {
                // User switched account
                console.log("Switching to new account:", accounts[0]);
                await checkWalletConnection();
            }
        });
        
        window.ethereum.on('chainChanged', async (chainId) => {
            console.log("Chain changed:", chainId);
            // Reload the page when network changes for consistency
            window.location.reload();
        });
        
        window.ethereum.on('disconnect', async () => {
            console.log("Wallet disconnected");
            userAddress = null;
            provider = null;
            signer = null;
            contract = null;
            showStatus("Wallet disconnected", "error");
            await updateWalletUI();
        });
    }

    // Connect MetaMask and switch to Doma Testnet
    connectWalletBtn.addEventListener("click", async () => {
        console.log("Connect wallet button clicked!");
        
        if (!window.ethereum) {
            showStatus("Please install MetaMask!", "error");
            return;
        }

        // Handle multiple wallet providers
        let selectedProvider = window.ethereum;
        if (window.ethereum && window.ethereum.providers) {
            selectedProvider = window.ethereum.providers.find((p) => p.isMetaMask);
            if (!selectedProvider) {
                showStatus("Multiple wallets detected. Please disable other wallet extensions (e.g., Coinbase Wallet) and keep only MetaMask enabled.", "error");
                return;
            }
        }

        try {
            showStatus("Connecting to wallet...", "");
            provider = new ethers.providers.Web3Provider(selectedProvider);
            await provider.send("eth_requestAccounts", []);

            // Switch to Doma Testnet
            const domaChainId = 97476; // Doma testnet Chain ID
            try {
                await selectedProvider.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: `0x${domaChainId.toString(16)}` }],
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await selectedProvider.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: `0x${domaChainId.toString(16)}`,
                            chainName: "Doma Testnet",
                            rpcUrls: ["https://rpc-testnet.doma.xyz"],
                            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                            blockExplorerUrls: ["https://explorer-testnet.doma.xyz"],
                        }],
                    });
                } else {
                    showStatus("Failed to switch to Doma Testnet!", "error");
                    return;
                }
            }

            // Verify network
            const network = await provider.getNetwork();
            if (network.chainId !== domaChainId) {
                showStatus("Please ensure MetaMask is on Doma Testnet!", "error");
                return;
            }

            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            // Export signer to global scope for dex.js
            window.signer = signer;
            
            if (!ethers.utils.isAddress(userAddress)) {
                showStatus("Invalid wallet address detected!", "error");
                return;
            }
            
            if (walletAddressSpan) {
                walletAddressSpan.textContent = userAddress;
            }
            console.log("User address:", userAddress); // Debug

            // Initialize contract only if contractAddress is provided and valid
            if (contractAddress && ethers.utils.isAddress(contractAddress)) {
                contract = new ethers.Contract(contractAddress, contractABI, signer);
                console.log("Contract initialized with address:", contractAddress);
            } else {
                console.log("No valid contract address provided, skipping contract initialization");
                contract = null;
            }

            // Verify contract
            try {
                const name = await contract.name();
                console.log("Contract name:", name);
                // Accept any token name for flexibility
                if (name) {
                    console.log("Contract verification successful:", name);
                } else {
                    throw new Error("Contract name is empty!");
                }
            } catch (error) {
                console.warn("Contract verification failed (continuing anyway):", error.message);
                // Don't return here, continue with functionality
            }

            // Update balance and UI
            await updateBalance();
            await updateWalletUI();
            
            // Initialize DEX contract if function is available
            if (typeof window.initializeDEX === 'function') {
                console.log("Initializing DEX contract...");
                await window.initializeDEX();
            }
            
            if (mintButton) {
                mintButton.disabled = false;
            }
            
            showStatus("Wallet connected successfully!", "success");
            
            // Save connection state to localStorage
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('userAddress', userAddress);
            
            if (recipientInput) {
                recipientInput.value = userAddress;
            }
        } catch (error) {
            console.error("Connection error:", error);
            showStatus(`Connection error: ${error.message}`, "error");
        }
    });

    // Check if wallet is already connected
    async function checkWalletConnection() {
        console.log("Checking wallet connection on page load...");
        
        // Check if user previously connected
        const wasConnected = localStorage.getItem('walletConnected') === 'true';
        const savedAddress = localStorage.getItem('userAddress');
        
        if (window.ethereum && (window.ethereum.selectedAddress || wasConnected)) {
            try {
                showStatus("Reconnecting to wallet...", "");
                
                provider = new ethers.providers.Web3Provider(window.ethereum);
                const accounts = await provider.listAccounts();
                
                if (accounts.length > 0) {
                    // Check if we're on the correct network
                    const network = await provider.getNetwork();
                    const domaChainId = 97476;
                    
                    if (network.chainId !== domaChainId) {
                        console.log("Wrong network detected, switching to Doma Testnet");
                        try {
                            await window.ethereum.request({
                                method: "wallet_switchEthereumChain",
                                params: [{ chainId: `0x${domaChainId.toString(16)}` }],
                            });
                        } catch (switchError) {
                            if (switchError.code === 4902) {
                                await window.ethereum.request({
                                    method: "wallet_addEthereumChain",
                                    params: [{
                                        chainId: `0x${domaChainId.toString(16)}`,
                                        chainName: "Doma Testnet",
                                        rpcUrls: ["https://rpc-testnet.doma.xyz"],
                                        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                                        blockExplorerUrls: ["https://explorer-testnet.doma.xyz"],
                                    }],
                                });
                            }
                        }
                        // Re-get provider after network switch
                        provider = new ethers.providers.Web3Provider(window.ethereum);
                    }
                    
                    signer = provider.getSigner();
                    userAddress = accounts[0];
                    
                    // Export signer to global scope for dex.js
                    window.signer = signer;
                    
                    console.log("Auto-reconnected with address:", userAddress);
                    
                    // Update localStorage with current address
                    localStorage.setItem('walletConnected', 'true');
                    localStorage.setItem('userAddress', userAddress);
                    
                    // Initialize contract only if valid address is provided
                    if (contractAddress && ethers.utils.isAddress(contractAddress)) {
                        contract = new ethers.Contract(contractAddress, contractABI, signer);
                        console.log("Contract re-initialized");
                        
                        // Verify contract
                        try {
                            const name = await contract.name();
                            console.log("Contract verified on reconnect:", name);
                        } catch (error) {
                            console.warn("Contract verification failed on reconnect:", error.message);
                        }
                    } else {
                        contract = null;
                        console.log("No contract address, skipping contract initialization");
                    }
                    
                    // Update UI
                    await updateWalletUI();
                    
                    // Initialize DEX contract if function is available
                    if (typeof window.initializeDEX === 'function') {
                        console.log("Initializing DEX contract on reconnect...");
                        await window.initializeDEX();
                    }
                    
                    if (walletAddressSpan) {
                        walletAddressSpan.textContent = userAddress;
                    }
                    
                    if (recipientInput) {
                        recipientInput.value = userAddress;
                    }
                    
                    if (mintButton) {
                        mintButton.disabled = false;
                    }
                    
                    showStatus("Wallet reconnected successfully!", "success");
                    console.log("Auto-reconnection completed successfully");
                } else {
                    console.log("No accounts found, clearing connection state");
                    localStorage.removeItem('walletConnected');
                    localStorage.removeItem('userAddress');
                    await updateWalletUI();
                }
            } catch (error) {
                console.error("Auto-connect failed:", error);
                showStatus("Auto-reconnect failed. Please connect manually.", "error");
                localStorage.removeItem('walletConnected');
                localStorage.removeItem('userAddress');
                await updateWalletUI();
            }
        } else {
            console.log("No wallet detected or not previously connected");
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('userAddress');
            await updateWalletUI();
        }
    }

    // Update wallet UI (show/hide balance and connect button)
    async function updateWalletUI() {
        console.log("updateWalletUI called");
        console.log("userAddress:", userAddress);
        console.log("provider:", provider);
        console.log("balanceDisplay:", balanceDisplay);
        console.log("ethBalanceSpan:", ethBalanceSpan);
        console.log("gjBalanceSpan:", gjBalanceSpan);
        
        if (userAddress && provider && balanceDisplay && ethBalanceSpan && gjBalanceSpan) {
            try {
                console.log("Updating wallet UI - connected state");
                
                // Hide connect button and show balance display
                connectWalletBtn.style.display = "none";
                balanceDisplay.style.display = "flex";
                
                // Update ETH balance
                console.log("Fetching ETH balance...");
                const ethBalance = await provider.getBalance(userAddress);
                const ethFormatted = parseFloat(ethers.utils.formatEther(ethBalance)).toFixed(4);
                ethBalanceSpan.textContent = `ETH: ${ethFormatted}`;
                console.log("ETH balance updated:", ethFormatted);
                
                // Update GJ balance if contract is available
                if (contract) {
                    console.log("Fetching GJ balance...");
                    const gjBalance = await contract.balanceOf(userAddress);
                    const decimals = await contract.decimals();
                    const gjFormatted = parseFloat(ethers.utils.formatUnits(gjBalance, decimals)).toFixed(4);
                    gjBalanceSpan.textContent = `GJ: ${gjFormatted}`;
                    console.log("GJ balance updated:", gjFormatted);
                } else {
                    console.log("Contract not available, setting GJ to 0");
                    gjBalanceSpan.textContent = "GJ: 0.0000";
                }
                
                // Update My Pools section if renderMyPools function is available
                if (typeof window.renderMyPools === 'function') {
                    console.log("Calling renderMyPools...");
                    await window.renderMyPools();
                } else {
                    console.log("renderMyPools function not available");
                }
            } catch (error) {
                console.error("Balance update error:", error);
                // Show connect button if there's an error
                connectWalletBtn.style.display = "block";
                balanceDisplay.style.display = "none";
            }
        } else {
            console.log("Updating wallet UI - disconnected state");
            // Show connect button and hide balance display
            if (connectWalletBtn) connectWalletBtn.style.display = "block";
            if (balanceDisplay) balanceDisplay.style.display = "none";
        }
    }

    // Update balance
    async function updateBalance() {
        if (contract && userAddress && ethers.utils.isAddress(userAddress)) {
            try {
                const balance = await contract.balanceOf(userAddress);
                const decimals = await contract.decimals();
                if (balanceSpan) {
                    balanceSpan.textContent = ethers.utils.formatUnits(balance, decimals);
                }
                
                // Also update wallet UI
                await updateWalletUI();
            } catch (error) {
                let errorMsg = error.message;
                if (error.code === "CALL_EXCEPTION") {
                    errorMsg = "Failed to fetch balance. Verify contract address and network!";
                }
                showStatus(`Balance error: ${errorMsg}`, "error");
            }
        } else if (!contract && userAddress) {
            console.log("Contract not available, updating wallet UI with ETH balance only");
            await updateWalletUI();
        } else {
            showStatus("Wallet or contract not initialized!", "error");
        }
    }

    // Handle mint
    if (mintButton) {
        mintButton.addEventListener("click", async (e) => {
            e.preventDefault(); // Ngăn form refresh trang
            e.stopPropagation(); // Ngăn event bubble up
            
            console.log("Mint button clicked - preventing default refresh");
            
            if (!contract) {
                showStatus("Contract not available. Please provide a valid GJ token contract address.", "error");
                return;
            }
            
            const recipient = recipientInput.value;
            if (!ethers.utils.isAddress(recipient)) {
                showStatus("Invalid recipient address!", "error");
                return;
            }
            
            if (mintButton) {
                mintButton.disabled = true;
            }
            showStatus("Processing transaction...", "");
            
            try {
                const tx = await contract.mint(recipient, { value: mintFee });
                showStatus("Transaction submitted, waiting for confirmation...", "");
                await tx.wait();
                showStatus("Mint successful! Received 0.666 GJ.", "success");
                await updateBalance();
                await updateWalletUI(); // Refresh wallet UI after mint
            } catch (error) {
                let errorMsg = error.message;
                if (error.code === "CALL_EXCEPTION") {
                    errorMsg = "Contract call failed. Verify contract address and network!";
                } else if (error.data?.message?.includes("Must send exactly 0.000666 ETH")) {
                    errorMsg = "Must send exactly 0.000666 ETH!";
                } else if (error.data?.message?.includes("Total supply cap exceeded")) {
                    errorMsg = "Total supply cap of 666,666 GJ reached!";
                } else if (error.code === 4001) {
                    errorMsg = "Transaction was rejected by user.";
                }
                showStatus(`Mint error: ${errorMsg}`, "error");
            } finally {
                if (mintButton) {
                    mintButton.disabled = false;
                }
            }
        });
    }
}
