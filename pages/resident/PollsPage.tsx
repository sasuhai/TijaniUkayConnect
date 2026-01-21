
import React, { FC, useState, useEffect, useCallback } from 'react';
import * as firebase from '../../services/firebaseService';
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
            // Fetch polls with options and votes
            const { data: pollsData, error: pollsError } = await firebase.getPolls();

            if (pollsError) {
                throw pollsError;
            }

            if (!pollsData) {
                setPolls([]);
                return;
            }

            const nowISO = new Date().toISOString();
            const activePolls = pollsData.filter((p: any) => p.end_date && p.end_date >= nowISO);
            const pollsList: Poll[] = [];

            for (const p of activePolls) {
                // Get all votes for this poll
                const { data: allVotes } = await firebase.getPollVotes(p.id);

                // Count votes per option
                const options = p.options ? p.options.map((opt: any) => {
                    const votes = allVotes ? allVotes.filter((v: any) => v.option_id === opt.id).length : 0;
                    return { id: opt.id, text: opt.text, votes };
                }) : [];

                // Check if user voted
                const myVote = allVotes ? allVotes.find((v: any) => v.user_id === user.id) : null;
                const totalVotes = options.reduce((acc: number, curr: any) => acc + curr.votes, 0);

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
            const { error } = await firebase.createPollVote({
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
