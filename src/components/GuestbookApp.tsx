import { useState, useCallback } from 'react'
import { ConnectKitButton } from 'connectkit'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useSwitchChain,
} from 'wagmi'
import { BookOpen, Send, RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { requireChain, buildTxExplorerUrl } from '@/onchain-facts'

// ARC_TESTNET chain id
const ARC_TESTNET_CHAIN_ID = 5042002

// Placeholder — will be replaced after deploy
const GUESTBOOK_ADDRESS = (import.meta.env.VITE_GUESTBOOK_ADDRESS ?? '') as `0x${string}`

const GUESTBOOK_ABI = [
  {
    name: 'signMessage',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'text', type: 'string' }],
    outputs: [],
  },
  {
    name: 'getMessages',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'messages',
        type: 'tuple[]',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'text', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getMessageCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'count', type: 'uint256' }],
  },
] as const

interface GuestbookEntry {
  sender: `0x${string}`
  text: string
  timestamp: bigint
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatDate(ts: bigint) {
  const ms = Number(ts) * 1000
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

function parseOnchainError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? ''
  if (msg.includes('user rejected') || msg.includes('denied')) return 'Transaction cancelled.'
  if (msg.includes('emptymessage')) return 'Message cannot be empty.'
  if (msg.includes('messagetoolong')) return 'Message exceeds 280 characters.'
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance'))
    return 'Insufficient balance for gas.'
  if (msg.includes('reverted')) return 'Transaction failed. Please try again.'
  if (msg.includes('network') || msg.includes('timeout'))
    return 'Network error. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}

export default function GuestbookApp() {
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const [text, setText] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isWrongChain = isConnected && chainId !== ARC_TESTNET_CHAIN_ID
  const arcChain = requireChain(ARC_TESTNET_CHAIN_ID)
  const isDeployed = GUESTBOOK_ADDRESS.startsWith('0x') && GUESTBOOK_ADDRESS.length === 42

  const {
    data: messages,
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useReadContract({
    address: isDeployed ? GUESTBOOK_ADDRESS : undefined,
    abi: GUESTBOOK_ABI,
    functionName: 'getMessages',
    chainId: ARC_TESTNET_CHAIN_ID,
    query: { enabled: isDeployed },
  })

  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    onReplaced: () => { void refetchMessages() },
  })

  // Refetch after success
  if (isSuccess && txHash) {
    void refetchMessages()
  }

  const charCount = text.length
  const overLimit = charCount > 280

  const handleSubmit = useCallback(() => {
    setSubmitError(null)
    if (!isConnected) return
    if (isWrongChain) {
      switchChain({ chainId: ARC_TESTNET_CHAIN_ID })
      return
    }
    if (!text.trim()) {
      setSubmitError('Please write something before signing.')
      return
    }
    if (overLimit) {
      setSubmitError('Message must be 280 characters or fewer.')
      return
    }
    if (!isDeployed) {
      setSubmitError('Contract not yet deployed.')
      return
    }
    try {
      resetWrite()
      writeContract({
        address: GUESTBOOK_ADDRESS,
        abi: GUESTBOOK_ABI,
        functionName: 'signMessage',
        args: [text],
      })
    } catch (err) {
      setSubmitError(parseOnchainError(err))
    }
  }, [isConnected, isWrongChain, switchChain, text, overLimit, isDeployed, writeContract, resetWrite])

  const handleSuccess = useCallback(() => {
    setText('')
    setSubmitError(null)
    resetWrite()
    void refetchMessages()
  }, [resetWrite, refetchMessages])

  const entries: GuestbookEntry[] = (messages as GuestbookEntry[] | undefined) ?? []

  const txStatusContent = () => {
    if (isPending) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--ink)' }}>
          <RefreshCw size={15} className="animate-spin shrink-0" />
          Waiting for wallet confirmation...
        </div>
      )
    }
    if (isConfirming) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--ink)' }}>
          <RefreshCw size={15} className="animate-spin shrink-0" />
          Confirming on Arc Testnet...
        </div>
      )
    }
    if (isSuccess && txHash) {
      return (
        <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(26,128,71,0.08)', color: 'var(--success)' }}>
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            Message signed on-chain!
          </span>
          <div className="flex items-center gap-3">
            <a
              href={buildTxExplorerUrl(ARC_TESTNET_CHAIN_ID, txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 underline underline-offset-2"
              style={{ color: 'var(--success)' }}
            >
              View <ExternalLink size={12} />
            </a>
            <button
              onClick={handleSuccess}
              className="underline underline-offset-2"
              style={{ color: 'var(--success)' }}
            >
              Write another
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <BookOpen size={16} color="white" />
          </div>
          <span className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>Arc Guestbook</span>
        </div>
        <ConnectKitButton />
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Hero */}
        <div className="text-center">
          <h1 className="display text-3xl font-semibold mb-2" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>
            Sign the Guestbook
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Leave a message on Arc Testnet. Every entry is stored onchain forever.
          </p>
        </div>

        {/* Wrong chain banner */}
        {isWrongChain && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm" style={{ borderColor: 'rgba(186,43,76,0.3)', background: 'rgba(186,43,76,0.07)', color: 'var(--danger)' }}>
            <AlertCircle size={16} className="shrink-0" />
            <span>
              You&apos;re on the wrong network. Switch to{' '}
              <button
                className="font-semibold underline underline-offset-2"
                onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
              >
                {arcChain.name}
              </button>
              .
            </span>
          </div>
        )}

        {/* Sign card */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4 border"
          style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', boxShadow: '0 1px 4px rgba(18,45,69,0.06)' }}
        >
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setSubmitError(null) }}
            placeholder={isConnected ? 'Write your message here...' : 'Connect your wallet to sign the guestbook.'}
            disabled={!isConnected || isPending || isConfirming || isSuccess}
            rows={4}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-all"
            style={{
              background: 'var(--surface-muted)',
              color: 'var(--ink)',
              border: `1.5px solid ${overLimit ? 'var(--danger)' : 'var(--border)'}`,
              fontFamily: "'DM Sans', sans-serif",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = overLimit ? 'var(--danger)' : 'var(--focus)' }}
            onBlur={e => { e.currentTarget.style.borderColor = overLimit ? 'var(--danger)' : 'var(--border)' }}
          />

          {/* Char count */}
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums" style={{ color: overLimit ? 'var(--danger)' : 'var(--subtle)' }}>
              {charCount} / 280
            </span>
            {submitError && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                <AlertCircle size={12} />
                {submitError}
              </span>
            )}
          </div>

          {/* CTA */}
          {isWrongChain ? (
            <button
              onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--danger)', color: '#fff' }}
            >
              Switch to Arc Testnet
            </button>
          ) : !isConnected ? (
            <div className="w-full">
              <ConnectKitButton.Custom>
                {({ show }) => (
                  <button
                    onClick={show}
                    className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Connect Wallet to Sign
                  </button>
                )}
              </ConnectKitButton.Custom>
            </div>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={isPending || isConfirming || isSuccess || overLimit || !text.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--accent)',
                color: '#fff',
              }}
              onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--accent)' }}
            >
              <Send size={15} />
              Sign Guestbook
            </button>
          )}

          {/* Tx status */}
          {txStatusContent()}
        </div>

        {/* Messages list */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="display text-base font-semibold" style={{ color: 'var(--ink)' }}>
              Recent Messages
              {entries.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full tabular-nums" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                  {entries.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => void refetchMessages()}
              className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--muted)' }}
              title="Refresh messages"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>

          {!isDeployed && (
            <div className="rounded-2xl p-6 text-center border" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Contract not yet deployed. Messages will appear here after deployment.</p>
            </div>
          )}

          {isDeployed && messagesLoading && (
            <div className="rounded-2xl p-6 text-center border" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <RefreshCw size={20} className="animate-spin mx-auto mb-2 opacity-40" />
              <p className="text-sm">Loading messages...</p>
            </div>
          )}

          {isDeployed && !messagesLoading && entries.length === 0 && (
            <div className="rounded-2xl p-6 text-center border" style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Be the first to sign!</p>
            </div>
          )}

          {isDeployed && !messagesLoading && entries.length > 0 && (
            <div className="flex flex-col gap-2">
              {[...entries].reverse().map((entry, i) => (
                <div
                  key={`${entry.sender}-${entry.timestamp}-${i}`}
                  className="rounded-xl px-4 py-4 border"
                  style={{ background: 'var(--surface-strong)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(18,45,69,0.04)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="mono text-xs font-medium" style={{ color: 'var(--ink)' }}>
                      {formatAddress(entry.sender)}
                      {address && entry.sender.toLowerCase() === address.toLowerCase() && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(18,45,69,0.08)', color: 'var(--muted)', fontFamily: "'DM Sans', sans-serif" }}>
                          you
                        </span>
                      )}
                    </span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--subtle)' }}>
                      {formatDate(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)', wordBreak: 'break-word' }}>
                    {entry.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: 'var(--subtle)' }}>
          Running on{' '}
          <a
            href={arcChain.explorerBase}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: 'var(--muted)' }}
          >
            Arc Testnet
          </a>
          . Testnet only — no real funds.
        </p>
      </main>
    </div>
  )
}
