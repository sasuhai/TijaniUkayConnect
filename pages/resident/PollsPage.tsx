
import React, { FC, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseService';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FullPageSpinner, Spinner } from '../../components/ui/Spinner';
import type { Poll } from '../../types';
import { toYyyyMmDd, getErrorMessage } from '../../utils/helpers';

export const PollsPage: FC = () => {
    const { user } = useAuth();
    const [polls, setPolls] = useState<Poll[]>([]);
    const [loading, setLoading] = useState(true);
    const [votingPollId, setVotingPollId] = useState<string | null>(null);

    const fetchPolls = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch Polls
            const { data: pollsData, error: pollsError } = await supabase
                .from('polls')
                .select('*')
                .gte('end_date', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (pollsError) {
                if (pollsError.code === 'PGRST205' || pollsError.code === '42P01') {
                    console.warn("Polls table missing");
                    setPolls([]);
                    return;
                }
                throw pollsError;
            }
            
            if (!pollsData) {
                setPolls([]);
                return;
            }

            const pollsList: Poll[] = [];

            for (const p of pollsData) {
                // 2. Fetch Options & Vote Counts
                // Note: In a production app, use a Supabase view or RPC to aggregate this efficiently.
                const { data: optionsData } = await supabase
                    .from('poll_options')
                    .select('id, text')
                    .eq('poll_id', p.id);

                const options = optionsData ? await Promise.all(optionsData.map(async (opt) => {
                     const { count } = await supabase
                        .from('poll_votes')
                        .select('*', { count: 'exact', head: true })
                        .eq('option_id', opt.id);
                     return { id: opt.id, text: opt.text, votes: count || 0 };
                })) : [];

                // 3. Check if user voted
                const { data: myVote } = await supabase
                    .from('poll_votes')
                    .select('option_id')
                    .eq('poll_id', p.id)
                    .eq('user_id', user.id)
                    .single();

                const totalVotes = options.reduce((acc, curr) => acc + curr.votes, 0);

                pollsList.push({
                    id: p.id,
                    question: p.question,
                    options: options,
                    totalVotes: totalVotes,
                    userVotedOptionId: myVote?.option_id || null,
                    endDate: toYyyyMmDd(new Date(p.end_date))
                });
            }

            setPolls(pollsList);

        } catch (error) {
            console.error("Error fetching polls:", error);
            alert(`Error fetching polls: ${getErrorMessage(error)}`);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPolls();
    }, [fetchPolls]);

    const handleVote = async (pollId: string, optionId: string) => {
        if (!user) return;
        setVotingPollId(pollId);
        try {
            const { error } = await supabase.from('poll_votes').insert({
                poll_id: pollId,
                option_id: optionId,
                user_id: user.id
            });

            if (error) throw error;
            
            // Refresh data
            await fetchPolls();

        } catch (error) {
            alert(`Failed to submit vote: ${getErrorMessage(error)}`);
        } finally {
            setVotingPollId(null);
        }
    };

    if (loading) return <FullPageSpinner message="Loading community polls..." />;

    return (
        <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-6">Community Polls</h1>
            {polls.length === 0 ? (
                <Card className="p-8 text-center text-gray-500">
                    <p className="text-lg">No active polls at the moment.</p>
                    <p className="text-sm mt-2">Check back later for new community questions.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {polls.map(poll => (
                        <Card key={poll.id} className="p-6">
                            <div className="mb-4">
                                <h3 className="text-xl font-semibold text-brand-dark mb-2">{poll.question}</h3>
                                <p className="text-sm text-gray-500">Ends on: {poll.endDate}</p>
                            </div>
                            
                            <div className="space-y-3">
                                {poll.options.map(option => {
                                    const percentage = poll.totalVotes > 0 
                                        ? Math.round((option.votes / poll.totalVotes) * 100) 
                                        : 0;
                                    const isSelected = poll.userVotedOptionId === option.id;
                                    const isVoting = votingPollId === poll.id;

                                    return (
                                        <div key={option.id} className="relative">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className={`font-medium ${isSelected ? 'text-brand-green' : 'text-gray-700'}`}>
                                                    {option.text} {isSelected && '(You voted)'}
                                                </span>
                                                <span className="text-gray-500">{percentage}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className={`h-2.5 rounded-full transition-all duration-500 ${isSelected ? 'bg-brand-green' : 'bg-gray-400'}`} 
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                            {!poll.userVotedOptionId && (
                                                <Button 
                                                    onClick={() => handleVote(poll.id, option.id)} 
                                                    variant="secondary" 
                                                    className="mt-2 w-full text-xs py-1"
                                                    disabled={isVoting}
                                                >
                                                    {isVoting ? <Spinner /> : 'Vote'}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-right text-sm text-gray-500 mt-4">{poll.totalVotes} votes total</p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
