'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, Eye, BookOpen, Users, Search, Filter, X, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

interface Module {
  id: string
  title: string
  description: string
  thumbnail?: string
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    moduleProgress: number
    chapters: number
  }
}

type SortField = 'order' | 'title' | 'chapters' | 'students' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function AdminModulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail: '',
    isActive: true
  })

  // États pour les filtres et tri
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>('order')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchModules()
  }, [session, status, router])

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/admin/modules')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setModules(data.modules || [])
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error)
      toast.error('Erreur lors du chargement des modules')
    } finally {
      setLoading(false)
    }
  }

  // Filtrage et tri des modules
  const filteredAndSortedModules = useMemo(() => {
    let filtered = modules.filter(module => {
      // Filtre par recherche
      const searchMatch = searchTerm === '' || 
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.description.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'active' && module.isActive) ||
        (statusFilter === 'inactive' && !module.isActive)

      return searchMatch && statusMatch
    })

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'order':
          comparison = a.order - b.order
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'chapters':
          comparison = (a._count?.chapters || 0) - (b._count?.chapters || 0)
          break
        case 'students':
          comparison = (a._count?.moduleProgress || 0) - (b._count?.moduleProgress || 0)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [modules, searchTerm, statusFilter, sortField, sortOrder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation côté client
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)

    try {
      const url = editingModule ? `/api/admin/modules/${editingModule.id}` : '/api/admin/modules'
      const method = editingModule ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          thumbnail: formData.thumbnail.trim() || null,
          isActive: formData.isActive
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }

      toast.success(editingModule ? 'Module mis à jour' : 'Module créé avec succès')
      setIsDialogOpen(false)
      resetForm()
      await fetchModules()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingModule(null)
    setFormData({
      title: '',
      description: '',
      thumbnail: '',
      isActive: true
    })
  }

  const handleEdit = (module: Module) => {
    setEditingModule(module)
    setFormData({
      title: module.title,
      description: module.description,
      thumbnail: module.thumbnail || '',
      isActive: module.isActive
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (module: Module) => {
    setModuleToDelete(module)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!moduleToDelete) return

    try {
      const response = await fetch(`/api/admin/modules/${moduleToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      toast.success('Module supprimé avec succès')
      await fetchModules()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setDeleteModalOpen(false)
      setModuleToDelete(null)
    }
  }

  const toggleActive = async (moduleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la mise à jour')
      }

      toast.success(`Module ${isActive ? 'activé' : 'désactivé'}`)
      await fetchModules()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour')
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setSortField('order')
    setSortOrder('asc')
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetForm()
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const activeFiltersCount = [
    searchTerm !== '',
    statusFilter !== 'all'
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Gestion des Modules</h1>
            <p className="text-gray-600 mt-2">Gérez les modules de formation spirituelle</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Module
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingModule ? 'Modifier le Module' : 'Nouveau Module'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    maxLength={200}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    maxLength={1000}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">URL de la miniature</Label>
                  <Input
                    id="thumbnail"
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Module actif</Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDialogClose(false)}
                    disabled={loading}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={loading}
                  >
                    {loading ? 'Chargement...' : (editingModule ? 'Mettre à jour' : 'Créer')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barre de recherche et filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col space-y-4">
              {/* Barre de recherche */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par titre ou description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-500"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>

              {/* Filtres avancés */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="active">Actifs uniquement</SelectItem>
                        <SelectItem value="inactive">Inactifs uniquement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trier par</Label>
                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order">Ordre</SelectItem>
                        <SelectItem value="title">Titre</SelectItem>
                        <SelectItem value="chapters">Nb. chapitres</SelectItem>
                        <SelectItem value="students">Nb. étudiants</SelectItem>
                        <SelectItem value="createdAt">Date de création</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ordre</Label>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Croissant</SelectItem>
                        <SelectItem value="desc">Décroissant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Liste des Modules ({filteredAndSortedModules.length}/{modules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAndSortedModules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {modules.length === 0 
                    ? "Aucun module trouvé. Créez votre premier module !"
                    : "Aucun module ne correspond aux critères de recherche."
                  }
                </p>
                {activeFiltersCount > 0 && modules.length > 0 && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('order')}
                        className="h-auto p-0 font-semibold"
                      >
                        Ordre
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('title')}
                        className="h-auto p-0 font-semibold"
                      >
                        Titre
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('chapters')}
                        className="h-auto p-0 font-semibold"
                      >
                        Chapitres
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('students')}
                        className="h-auto p-0 font-semibold"
                      >
                        Étudiants
                        <ArrowUpDown className="w-4 h-4 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedModules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell>
                        <Badge variant="outline">#{module.order}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{module.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {module.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-1 text-gray-400" />
                          {module._count?.chapters || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {module._count?.moduleProgress || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={module.isActive}
                            onCheckedChange={(checked) => toggleActive(module.id, checked)}
                          />
                          <Badge variant={module.isActive ? 'default' : 'secondary'}>
                            {module.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/modules/${module.id}`)}
                            title="Voir le module"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(module)}
                            title="Modifier le module"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(module)}
                            className="text-red-600 hover:text-red-700"
                            title="Supprimer le module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de confirmation de suppression */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span>Confirmer la suppression</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Êtes-vous sûr de vouloir supprimer le module{' '}
                  <span className="font-semibold">"{moduleToDelete?.title}"</span> ?
                </p>
                {moduleToDelete && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Ordre:</span> #{moduleToDelete.order}
                      </div>
                      <div>
                        <span className="font-medium">Chapitres:</span> {moduleToDelete._count?.chapters || 0}
                      </div>
                      <div>
                        <span className="font-medium">Étudiants inscrits:</span> {moduleToDelete._count?.moduleProgress || 0}
                      </div>
                      <div>
                        <span className="font-medium">Statut:</span>{' '}
                        <Badge variant={moduleToDelete.isActive ? 'default' : 'secondary'}>
                          {moduleToDelete.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-red-600 font-medium">
                  ⚠️ Cette action supprimera également tous les chapitres, contenus et progressions associés. Cette action est irréversible.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Supprimer définitivement
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}