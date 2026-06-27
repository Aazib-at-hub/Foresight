import React, { useState } from "react";
import { Sparkles, CornerDownLeft, Plus } from "lucide-react";

interface CommitmentFormProps {
  onAddCommitment: (nlpText: string) => Promise<void>;
  isParsing: boolean;
}

export default function CommitmentForm({ onAddCommitment, isParsing }: CommitmentFormProps) {
  const [nlpText, setNlpText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;
    setError("");
    
    try {
      await onAddCommitment(nlpText.trim());
      setNlpText("");
    } catch (err: any) {
      setError(err.message || "Failed to process commitment. Please check connection.");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNlpText(suggestion);
  };

  const suggestions = [
    "Prepare for AI Interview by Friday",
    "Build Hospital Website by next Friday",
    "Study for Advanced Algebra Exam tomorrow",
    "Submit Business Proposal in 4 days"
  ];

  return (
    <div className="border border-[#1A1A1A]/10 bg-[#EFEDE9] p-6 mb-8 font-sans rounded-sm relative">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-8 h-8 bg-[#1A1A1A] text-[#F4F1EE] flex items-center justify-center font-serif italic font-bold text-lg shrink-0">
          f
        </div>
        <div>
          <h2 className="text-lg font-serif italic text-[#1A1A1A] font-light">
            Commitment Intake Ledger
          </h2>
          <p className="text-xs text-[#1A1A1A]/60 font-medium">
            Express commitments in plain, natural English. Our semantic agent compiles timeline variables.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="relative flex-grow w-full">
            <label className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/50 block font-mono mb-1 font-semibold">
              Natural Language Declaration
            </label>
            <input
              type="text"
              required
              disabled={isParsing}
              placeholder="e.g., Prepare for AI Interview by Friday..."
              className="w-full bg-transparent border-b border-[#1A1A1A]/20 focus:border-[#1A1A1A] text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none transition-all text-sm font-medium py-2 rounded-none"
              value={nlpText}
              onChange={(e) => setNlpText(e.target.value)}
            />
            <div className="absolute right-0 bottom-2.5 text-[#1A1A1A]/30 hidden sm:block">
              <CornerDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isParsing || !nlpText.trim()}
            className="px-5 py-3 bg-[#1A1A1A] hover:bg-black text-[#F4F1EE] font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 rounded-none w-full sm:w-auto"
          >
            {isParsing ? (
              <>
                <span className="inline-block w-3 h-3 border border-[#F4F1EE] border-t-transparent animate-spin"></span>
                Compiling...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> File Commitment
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-xs text-rose-700 mt-3 font-medium font-mono">{error}</p>
      )}

      {/* Suggestion Chips */}
      <div className="mt-6 pt-4 border-t border-[#1A1A1A]/5">
        <span className="text-[9px] uppercase font-bold tracking-wider text-[#1A1A1A]/40 block mb-2 font-mono">
          Common Declarative Formats (Select to load)
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 border border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30 hover:bg-[#1A1A1A]/5 text-[#1A1A1A]/70 hover:text-[#1A1A1A] text-xs font-medium cursor-pointer transition-colors rounded-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
