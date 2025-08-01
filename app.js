
document.addEventListener("DOMContentLoaded", () => {
    // Initialize app immediately when DOM is ready
    initializeApp();
});

function initializeApp() {
    // Get DOM elements with error checking
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
    const liveIndicator = document.getElementById("liveIndicator");

    // Check if critical elements exist
    if (!connectWalletBtn) {
        console.error("Connect Wallet button not found!");
        return;
    }

    console.log("🚀 App initialization starting...");
    console.log("Connect Wallet button found:", connectWalletBtn);

    let provider, signer, contract, userAddress;
    let balanceUpdateInterval;
    let isUpdatingBalance = false;

    // Contract configuration
    const contractAddress = "0x6B7ca0E7dDED09492ecC281d4Bf8C4c872C89c8E";
    const mintFee = ethers.utils.parseEther("0.000666");
    const contractABI = [
        "function mint(address to) public payable",
        "function balanceOf(address owner) public view returns (uint256)",
        "function name() public view returns (string)",
        "function decimals() public view returns (uint8)",
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) public view returns (uint256)"
    ];

    if (!connectWalletBtn) {
        return;
    }

    console.log("✅ All elements found, setting up wallet connection...");
    
    // Simple utility function to show status
    function showStatus(message, type = "") {
        console.log(`📢 Status [${type}]:`, message);
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
    }

    // Simple connect wallet function
    async function connectWallet() {
        console.log("🔗 Connect Wallet function called!");
        
        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                showStatus("Please install MetaMask!", "error");
                alert("Please install MetaMask to use this application!");
                return;
            }

            console.log("✅ MetaMask detected");
            showStatus("Connecting to MetaMask...", "");
            
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            console.log("✅ Accounts received:", accounts);

            if (accounts.length === 0) {
                showStatus("No accounts found. Please create an account in MetaMask.", "error");
                return;
            }

            userAddress = accounts[0];
            console.log("✅ User address:", userAddress);

            // Create provider and signer
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            console.log("✅ Provider and signer created");

            // Try to switch to Doma Testnet
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x17CE4' }], // 97476 in hex
                });
                console.log("✅ Switched to Doma Testnet");
            } catch (switchError) {
                console.log("⚠️ Switch error:", switchError);
                // If network doesn't exist, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x17CE4',
                                chainName: 'Doma Testnet',
                                nativeCurrency: {
                                    name: 'ETH',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                rpcUrls: ['https://rpc-doma-testnet.t.conduit.xyz'],
                                blockExplorerUrls: ['https://explorer-doma-dev-ix58nm4rnd.t.conduit.xyz']
                            }]
                        });
                        console.log("✅ Added Doma Testnet");
                    } catch (addError) {
                        console.error("❌ Failed to add network:", addError);
                        showStatus("Failed to add Doma Testnet", "error");
                        return;
                    }
                }
            }

            // Create contract instance
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            console.log("✅ Contract instance created");

            // Update UI
            showStatus("Wallet connected successfully!", "success");
            await updateWalletUI();

            // Start real-time balance monitoring
            startRealTimeBalanceUpdates();

            console.log("🎉 Wallet connection complete!");

        } catch (error) {
            console.error("❌ Connection error:", error);
            showStatus(`Connection failed: ${error.message}`, "error");
        }
    }

    // Add event listener
    connectWalletBtn.addEventListener("click", connectWallet);
    console.log("✅ Event listener added to Connect Wallet button");

    // Real-time balance monitoring
    function startRealTimeBalanceUpdates() {
        // Clear any existing interval
        if (balanceUpdateInterval) {
            clearInterval(balanceUpdateInterval);
        }

        console.log("🚀 Starting real-time balance updates...");
        
        // Show live indicator
        if (liveIndicator) {
            liveIndicator.style.display = "block";
        }

        // Update immediately
        updateBalancesQuick();

        // Set up automatic updates every 3 seconds
        balanceUpdateInterval = setInterval(async () => {
            if (userAddress && provider && !isUpdatingBalance) {
                isUpdatingBalance = true;
                try {
                    await updateBalancesQuick();
                } catch (error) {
                    console.error("Real-time balance update error:", error);
                } finally {
                    isUpdatingBalance = false;
                }
            }
        }, 3000); // Update every 3 seconds

        console.log("✅ Real-time balance updates started");
    }

    // Stop real-time updates
    function stopRealTimeBalanceUpdates() {
        if (balanceUpdateInterval) {
            clearInterval(balanceUpdateInterval);
            balanceUpdateInterval = null;
            console.log("⏹️ Real-time balance updates stopped");
        }
        
        if (liveIndicator) {
            liveIndicator.style.display = "none";
        }
    }

    // Enhanced balance update with animation
    async function updateBalancesQuick() {
        if (!userAddress || !provider || isUpdatingBalance) return;

        isUpdatingBalance = true;

        try {
            // Update ETH balance
            const ethBalance = await provider.getBalance(userAddress);
            const ethFormatted = parseFloat(ethers.utils.formatEther(ethBalance)).toFixed(4);
            
            if (ethBalanceSpan) {
                // Check if balance changed
                const currentText = ethBalanceSpan.textContent;
                const newText = `ETH: ${ethFormatted}`;
                
                if (currentText !== newText) {
                    ethBalanceSpan.textContent = newText;
                    // Add flash animation for balance change
                    ethBalanceSpan.style.animation = 'balanceFlash 0.6s ease-out';
                    setTimeout(() => {
                        if (ethBalanceSpan) ethBalanceSpan.style.animation = '';
                    }, 600);
                } else {
                    ethBalanceSpan.textContent = newText;
                }
            }

            // Update GJ balance
            if (contract) {
                const gjBalance = await contract.balanceOf(userAddress);
                const decimals = await contract.decimals();
                const gjFormatted = parseFloat(ethers.utils.formatUnits(gjBalance, decimals)).toFixed(4);
                
                if (gjBalanceSpan) {
                    // Check if balance changed
                    const currentText = gjBalanceSpan.textContent;
                    const newText = `GJ: ${gjFormatted}`;
                    
                    if (currentText !== newText) {
                        gjBalanceSpan.textContent = newText;
                        // Add flash animation for balance change
                        gjBalanceSpan.style.animation = 'balanceFlash 0.6s ease-out';
                        setTimeout(() => {
                            if (gjBalanceSpan) gjBalanceSpan.style.animation = '';
                        }, 600);
                    } else {
                        gjBalanceSpan.textContent = newText;
                    }
                } else {
                    if (gjBalanceSpan) gjBalanceSpan.textContent = "GJ: 0.0000";
                }
            } else {
                if (gjBalanceSpan) gjBalanceSpan.textContent = "GJ: 0.0000";
            }

        } catch (error) {
            console.error("❌ Balance update error:", error);
        } finally {
            isUpdatingBalance = false;
        }
    }
    
    // Check if wallet is already connected on page load
    async function checkWalletConnection() {
        console.log("🔍 Checking existing wallet connection...");
        
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    console.log("✅ Found existing wallet connection:", accounts[0]);
                    userAddress = accounts[0];
                    provider = new ethers.providers.Web3Provider(window.ethereum);
                    signer = provider.getSigner();
                    contract = new ethers.Contract(contractAddress, contractABI, signer);
                    await updateWalletUI();
                    // Start real-time updates if wallet is already connected
                    startRealTimeBalanceUpdates();
                } else {
                    console.log("⚠️ No existing wallet connection found");
                }
            }
        } catch (error) {
            console.error("❌ Error checking wallet connection:", error);
        }
    }

    // Check wallet connection on page load
    checkWalletConnection();
    
    // Enhanced MetaMask event listeners for real-time updates
    if (window.ethereum) {
        let accountChangeTimeout;
        
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log("🔄 Account changed:", accounts);
            clearTimeout(accountChangeTimeout);
            accountChangeTimeout = setTimeout(async () => {
                if (accounts.length === 0) {
                    console.log("🚪 Wallet disconnected");
                    userAddress = null;
                    provider = null;
                    signer = null;
                    contract = null;
                    stopRealTimeBalanceUpdates();
                    showStatus("Wallet disconnected", "error");
                    await updateWalletUI();
                } else if (accounts[0] !== userAddress) {
                    console.log("🔄 Account switched to:", accounts[0]);
                    userAddress = accounts[0];
                    await checkWalletConnection();
                }
            }, 100);
        });
        
        window.ethereum.on('chainChanged', (chainId) => {
            console.log("🔗 Chain changed to:", chainId);
            // Stop real-time updates before reload
            stopRealTimeBalanceUpdates();
            window.location.reload();
        });
        
        window.ethereum.on('disconnect', async () => {
            console.log("🚪 Wallet disconnected via event");
            userAddress = null;
            provider = null;
            signer = null;
            contract = null;
            stopRealTimeBalanceUpdates();
            showStatus("Wallet disconnected", "error");
            await updateWalletUI();
        });
    }

    // Connect MetaMask and switch to Doma Testnet
    connectWalletBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log("Connect Wallet button clicked!");
        
        if (!window.ethereum) {
            showStatus("Please install MetaMask!", "error");
            return;
        }

        try {
            // Disable button temporarily to prevent double clicks
            connectWalletBtn.disabled = true;
            connectWalletBtn.textContent = "Connecting...";

            // Handle multiple wallet providers
            let selectedProvider = window.ethereum;
            if (window.ethereum && window.ethereum.providers) {
                selectedProvider = window.ethereum.providers.find((p) => p.isMetaMask);
                if (!selectedProvider) {
                    showStatus("Multiple wallets detected. Please disable other wallet extensions (e.g., Coinbase Wallet) and keep only MetaMask enabled.", "error");
                    return;
                }
            }

            showStatus("Connecting to wallet...", "");
            provider = new ethers.providers.Web3Provider(selectedProvider);
            await provider.send("eth_requestAccounts", []);

            // Switch to Doma Testnet
            const domaChainId = 97476;
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

            // Initialize contract
            if (contractAddress && ethers.utils.isAddress(contractAddress)) {
                contract = new ethers.Contract(contractAddress, contractABI, signer);
            } else {
                contract = null;
            }

            // Verify contract
            try {
                if (contract) {
                    const name = await contract.name();
                    if (!name) {
                        throw new Error("Contract name is empty!");
                    }
                }
            } catch (error) {
                // Continue with functionality even if contract verification fails
            }

            // Update balance and UI
            await updateWalletUI();
            
            // Initialize DEX contract if function is available
            if (typeof window.initializeDEX === 'function') {
                await window.initializeDEX();
            }
            
            if (mintButton) {
                mintButton.disabled = false;
            }
            
            showStatus("Wallet connected successfully!", "success");
            
            // Start real-time balance updates
            startRealTimeBalanceUpdates();
            
            // Save connection state
            localStorage.setItem('walletConnected', 'true');
            localStorage.setItem('userAddress', userAddress);
            
            if (recipientInput) {
                recipientInput.value = userAddress;
            }
        } catch (error) {
            showStatus(`Connection error: ${error.message}`, "error");
        } finally {
            // Reset button state
            connectWalletBtn.disabled = false;
            connectWalletBtn.textContent = "Connect Wallet";
        }
    });

    // Check if wallet is already connected
    async function checkWalletConnection() {
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
                    
                    // Start real-time balance updates
                    startRealTimeBalanceUpdates();
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

    // Optimized update wallet UI (remove all logs, improve performance)
    async function updateWalletUI() {
        console.log("🔄 Updating wallet UI...");
        
        if (userAddress && provider && balanceDisplay && ethBalanceSpan && gjBalanceSpan) {
            try {
                console.log("✅ All elements available, updating UI...");
                
                // Hide connect button and show balance display
                connectWalletBtn.style.display = "none";
                balanceDisplay.style.display = "flex";
                
                // Use the optimized balance update function
                await updateBalancesQuick();
                
                // Start real-time balance updates if not already running
                if (!balanceUpdateInterval) {
                    startRealTimeBalanceUpdates();
                }
                
                console.log("✅ Wallet UI updated successfully");
                
                // Update other components if available
                if (typeof window.renderMyPools === 'function') {
                    await window.renderMyPools();
                }
                
                if (typeof window.updateWETHBalances === 'function') {
                    await window.updateWETHBalances();
                }
            } catch (error) {
                console.error("❌ Wallet UI update error:", error);
                // Show connect button if there's an error
                connectWalletBtn.style.display = "block";
                balanceDisplay.style.display = "none";
            }
        } else {
            console.log("⚠️ Missing elements for wallet UI update");
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
    
    // Setup Create Token functionality
    setupCreateTokenFunctionality();
    
    // Function to handle create token functionality
    function setupCreateTokenFunctionality() {
        const approveBtn = document.getElementById('approveGJBtn');
        const createBtn = document.getElementById('createTokenBtn');
        const createTokenForm = document.getElementById('createTokenForm');
        const createTokenStatus = document.getElementById('createTokenStatus');
        
        function showCreateTokenStatus(message, type = '') {
            if (createTokenStatus) {
                createTokenStatus.textContent = message;
                createTokenStatus.className = `status ${type}`;
            }
        }
        
        if (approveBtn) {
            approveBtn.addEventListener('click', async () => {
                console.log('Approve 6 GJ button clicked');
                
                if (!contract || !signer) {
                    showCreateTokenStatus('Please connect your wallet first!', 'error');
                    return;
                }
                
                try {
                    // Check GJ balance first
                    const balance = await contract.balanceOf(userAddress);
                    const balanceInGJ = parseFloat(ethers.utils.formatEther(balance));
                    const requiredGJ = 6;
                    
                    console.log(`Current GJ balance: ${balanceInGJ}, Required: ${requiredGJ}`);
                    
                    if (balanceInGJ < requiredGJ) {
                        showCreateTokenStatus(`Insufficient GJ balance! You need ${requiredGJ} GJ but have ${balanceInGJ.toFixed(4)} GJ`, 'error');
                        return;
                    }
                    
                    // Get DEX contract address
                    const dexAddress = window.dexContract?.address || '0x09b98f0a16f0BA62DcFf31A4650Ac8873a492CCF';
                    console.log('DEX contract address:', dexAddress);
                    
                    showCreateTokenStatus('Approving 6 GJ for token creation...', '');
                    approveBtn.disabled = true;
                    
                    // Approve 6 GJ to DEX contract
                    const approveAmount = ethers.utils.parseEther('6');
                    const approveTx = await contract.approve(dexAddress, approveAmount);
                    
                    showCreateTokenStatus('Approval transaction submitted, waiting for confirmation...', '');
                    await approveTx.wait();
                    
                    showCreateTokenStatus('6 GJ approved successfully! You can now create the token.', 'success');
                    
                    // Hide approve button and show create button
                    approveBtn.style.display = 'none';
                    createBtn.style.display = 'block';
                    
                } catch (error) {
                    console.error('Approve error:', error);
                    let errorMsg = error.message;
                    if (error.code === 4001) {
                        errorMsg = 'Transaction was rejected by user.';
                    }
                    showCreateTokenStatus(`Approve failed: ${errorMsg}`, 'error');
                } finally {
                    approveBtn.disabled = false;
                }
            });
        }
        
        if (createTokenForm) {
            createTokenForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Create token form submitted');
                
                if (!window.dexContract || !signer) {
                    showCreateTokenStatus('DEX contract not available. Please connect wallet and try again.', 'error');
                    return;
                }
                
                const tokenName = document.getElementById('newTokenName').value.trim();
                const tokenSymbol = document.getElementById('newTokenSymbol').value.trim();
                const tokenSupply = document.getElementById('newTokenSupply').value.trim();
                
                if (!tokenName || !tokenSymbol || !tokenSupply) {
                    showCreateTokenStatus('Please fill in all fields!', 'error');
                    return;
                }
                
                try {
                    showCreateTokenStatus('Creating token...', '');
                    createBtn.disabled = true;
                    
                    const supplyInWei = ethers.utils.parseEther(tokenSupply);
                    const createTx = await window.dexContract.createToken(tokenName, tokenSymbol, supplyInWei);
                    
                    showCreateTokenStatus('Token creation transaction submitted, waiting for confirmation...', '');
                    const receipt = await createTx.wait();
                    
                    showCreateTokenStatus(`Token '${tokenName}' (${tokenSymbol}) created successfully!`, 'success');
                    
                    // Reset form and buttons
                    createTokenForm.reset();
                    approveBtn.style.display = 'block';
                    createBtn.style.display = 'none';
                    
                    // Update balance and token list
                    await updateBalance();
                    if (typeof window.loadVerifiedTokens === 'function') {
                        await window.loadVerifiedTokens();
                    }
                    
                } catch (error) {
                    console.error('Create token error:', error);
                    let errorMsg = error.message;
                    if (error.code === 4001) {
                        errorMsg = 'Transaction was rejected by user.';
                    } else if (error.message.includes('insufficient allowance')) {
                        errorMsg = 'Insufficient allowance. Please approve 6 GJ first.';
                        // Reset buttons
                        approveBtn.style.display = 'block';
                        createBtn.style.display = 'none';
                    }
                    showCreateTokenStatus(`Token creation failed: ${errorMsg}`, 'error');
                } finally {
                    createBtn.disabled = false;
                }
            });
        }
    }
}

// Export functions to window for dex.js to use
window.updateBalancesQuick = updateBalancesQuick;
window.startRealTimeBalanceUpdates = startRealTimeBalanceUpdates;
window.stopRealTimeBalanceUpdates = stopRealTimeBalanceUpdates;
