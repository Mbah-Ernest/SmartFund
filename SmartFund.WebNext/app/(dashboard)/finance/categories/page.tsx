'use client'

import { useState, useEffect } from 'react'
import { Plus, Tags, MoreVertical, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/apiClient'

type CategoryType = 'income' | 'expense'

interface Category {
  id: number
  name: string
  type: number // 0=Income, 1=Expense
}

const CATEGORY_COLORS = [
  'bg-primary', 'bg-success', 'bg-destructive', 'bg-warning',
  'bg-blue-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' as CategoryType })

  const loadCategories = () => {
    setLoading(true)
    api.get('/api/personal-categories')
      .then(r => setCategories(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCategories() }, [])

  const handleAddCategory = async () => {
    if (!newCategory.name) return
    setSubmitting(true)
    try {
      await api.post('/api/personal-categories', {
        name: newCategory.name,
        type: newCategory.type === 'income' ? 0 : 1,
      })
      setNewCategory({ name: '', type: 'expense' })
      setDialogOpen(false)
      loadCategories()
    } catch { alert('Failed to create category.') }
    finally { setSubmitting(false) }
  }

  const handleRename = async (id: number) => {
    if (!editName.trim()) return
    setSubmitting(true)
    try {
      await api.put(`/api/personal-categories/${id}`, { name: editName })
      setEditId(null)
      setEditName('')
      loadCategories()
    } catch { alert('Failed to rename category.') }
    finally { setSubmitting(false) }
  }

  const incomeCategories = categories.filter(c => c.type === 0)
  const expenseCategories = categories.filter(c => c.type === 1)

  const CategoryGrid = ({ items }: { items: Category[] }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((category, idx) => (
        <Card key={category.id} className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} flex items-center justify-center`}>
                  <Tags className="h-5 w-5 text-white" />
                </div>
                <div>
                  {editId === category.id ? (
                    <div className="flex gap-2">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" />
                      <Button size="sm" onClick={() => handleRename(category.id)} disabled={submitting}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                    </div>
                  ) : (
                    <h3 className="font-semibold">{category.name}</h3>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditId(category.id); setEditName(category.name) }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage your income and expense categories
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a new category for organizing your transactions
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Category Name</FieldLabel>
                <Input
                  placeholder="e.g., Groceries"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={newCategory.type}
                  onValueChange={(value: CategoryType) => setNewCategory(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCategory} disabled={!newCategory.name || submitting}>
                {submitting ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="expense" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expense">
            Expense Categories
            <Badge variant="secondary" className="ml-2">{expenseCategories.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="income">
            Income Categories
            <Badge variant="secondary" className="ml-2">{incomeCategories.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <CategoryGrid items={expenseCategories} />
          )}
        </TabsContent>

        <TabsContent value="income">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : (
            <CategoryGrid items={incomeCategories} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
