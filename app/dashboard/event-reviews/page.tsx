'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Star, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface EventReview {
  id: string
  event_id: string
  user_id: string
  rating: string
  comment: string | null
  created_at: string
  updated_at: string
  user_full_name: string
  user_phone: string
  event_title: string
}

const RATING_LABELS: Record<string, string> = {
  good: 'Good',
  normal: 'Normal',
  bad: 'Bad',
}

const RATING_COLORS: Record<string, string> = {
  good: 'bg-green-100 text-green-800',
  normal: 'bg-blue-100 text-blue-800',
  bad: 'bg-red-100 text-red-800',
}

function RatingBadge({ rating }: { rating: string }) {
  return (
    <Badge className={RATING_COLORS[rating] || 'bg-gray-100 text-gray-800'}>
      {RATING_LABELS[rating] || rating}
    </Badge>
  )
}

export default function EventReviewsPage() {
  const [reviews, setReviews] = useState<EventReview[]>([])
  const [filteredReviews, setFilteredReviews] = useState<EventReview[]>([])
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<EventReview | null>(null)
  const [rating, setRating] = useState<string>('')
  const [comment, setComment] = useState('')

  const supabase = createBrowserClient()

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_event_reviews_for_admin', {
        p_limit: 100,
        p_offset: 0,
      })
      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Error loading event reviews:', error)
      toast.error('Failed to load event reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let filtered = [...reviews]
    if (ratingFilter !== 'all') {
      filtered = filtered.filter((r) => r.rating === ratingFilter)
    }
    setFilteredReviews(filtered)
  }, [reviews, ratingFilter])

  const openReview = (review: EventReview) => {
    setSelectedReview(review)
    setRating(review.rating)
    setComment(review.comment || '')
  }

  const handleUpdate = async () => {
    if (!selectedReview) return
    if (!rating) {
      toast.error('Please select a rating')
      return
    }

    try {
      const { error } = await supabase.rpc('admin_update_event_review', {
        p_review_id: selectedReview.id,
        p_rating: rating,
        p_comment: comment,
      })
      if (error) throw error
      toast.success('Review updated')
      setSelectedReview(null)
      load()
    } catch (error) {
      console.error('Error updating review:', error)
      toast.error('Failed to update review')
    }
  }

  const handleDelete = async () => {
    if (!selectedReview) return
    if (!window.confirm('Delete this review? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('event_reviews')
        .delete()
        .eq('id', selectedReview.id)
      if (error) throw error
      toast.success('Review deleted')
      setSelectedReview(null)
      load()
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Failed to delete review')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Event Reviews</h1>
        <p className="text-gray-600 mt-1">Moderate and review event ratings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Event Reviews</CardTitle>
          <CardDescription>Total: {reviews.length} reviews</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bad">Bad</SelectItem>
            </SelectContent>
          </Select>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {reviews.length === 0
                ? 'No reviews yet.'
                : 'No reviews match the selected filter.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-gray-900">{review.event_title}</p>
                        <RatingBadge rating={review.rating} />
                      </div>
                      <p className="text-sm text-gray-500 mb-1">
                        By {review.user_full_name} &middot; {review.user_phone}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(review.created_at).toLocaleDateString('en-IN')}
                      </p>
                      {review.comment && (
                        <p className="text-sm text-gray-700 italic bg-gray-50 p-2 rounded">
                          &quot;{review.comment}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openReview(review)}>
                        <Eye className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedReview(review)
                          setTimeout(() => handleDelete(), 100)
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Moderate Review</DialogTitle>
              <DialogDescription>{selectedReview.event_title}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Reviewer</p>
                  <p className="font-medium">{selectedReview.user_full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{selectedReview.user_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Submitted</p>
                  <p className="font-medium">
                    {new Date(selectedReview.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current rating</p>
                  <RatingBadge rating={selectedReview.rating} />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Rating</p>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bad">Bad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Comment</p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Review comment"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!rating}>
                <Star className="w-4 h-4 mr-1" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
