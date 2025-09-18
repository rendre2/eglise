'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Edit, Trash2, BookOpen, Video, Headphones, HelpCircle, Search, Filter, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Chapter {
  id: string
  moduleId: string
  title: string
  description: string
  order: number
  isActive: boolean
  module: {
    title: string
    order: number
  }
  contents: Array<{
    id: string
    title: string
    type: 'VIDEO' | 'AUDIO'
    duration: number
  }>
  quiz?: {
    id: string
    title: string
    passingScore: number
  }
  _count: {
    contents: number
    chapterProgress: number
  }
}

interface Module {
  id: string
  title: string
  order: number
}

export default function AdminChaptersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null)
  const [formData, setFormData] = useState({
    moduleId: '',
    title: '',
    description: ''
  })

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [hasQuizFilter, setHasQuizFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [chaptersRes, modulesRes] = await Promise.all([
        fetch('/api/admin/chapters'),
        fetch('/api/admin/modules')
      ])
      
      if (chaptersRes.ok) {
        const chaptersData = await chaptersRes.json()
        setChapters(chaptersData.chapters || [])
      }
      
      if (modulesRes.ok) {
        const modulesData = await modulesRes.json()
        setModules(modulesData.modules || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  // Filtrage des chapitres
  const filteredChapters = useMemo(() => {
    return chapters.filter(chapter => {
      // Filtre par recherche
      const searchMatch = searchTerm === '' || 
        chapter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chapter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chapter.module.title.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par module
      const moduleMatch = selectedModule === 'all' || chapter.moduleId === selectedModule

      // Filtre par quiz
      const quizMatch = hasQuizFilter === 'all' ||
        (hasQuizFilter === 'with' && chapter.quiz) ||
        (hasQuizFilter === 'without' && !chapter.quiz)

      return searchMatch && moduleMatch && quizMatch
    })
  }, [chapters, searchTerm, selectedModule, hasQuizFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.moduleId || !formData.title.trim() || !formData.description.trim()) {
      toast.error('Tous les champs sont obligatoires')
      return
    }
    
    setSubmitting(true)

    try {
      const url = editingChapter ? `/api/admin/chapters/${editingChapter.id}` : '/api/admin/chapters'
      const method = editingChapter ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Erreur lors de la sauvegarde')
      }

      toast.success(responseData.message || (editingChapter ? 'Chapitre mis à jour' : 'Chapitre créé'))
      setIsDialogOpen(false)
      resetForm()
      await fetchData()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditingChapter(null)
    setFormData({
      moduleId: '',
      title: '',
      description: ''
    })
  }

  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setFormData({
      moduleId: chapter.moduleId,
      title: chapter.title,
      description: chapter.description
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (chapter: Chapter) => {
    setChapterToDelete(chapter)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!chapterToDelete) return

    try {
      const response = await fetch(`/api/admin/chapters/${chapterToDelete.id}`, {
        method: 'DELETE',
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Erreur lors de la suppression')
      }

      toast.success('Chapitre supprimé avec succès')
      await fetchData()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setDeleteModalOpen(false)
      setChapterToDelete(null)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedModule('all')
    setHasQuizFilter('all')
  }

  const getTotalDuration = (contents: Chapter['contents']) => {
    return contents.reduce((total, content) => total + content.duration, 0)
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
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
    selectedModule !== 'all',
    hasQuizFilter !== 'all'
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Gestion des Chapitres</h1>
            <p className="text-gray-600 mt-2">Organisez vos modules en chapitres</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Chapitre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingChapter ? 'Modifier le Chapitre' : 'Nouveau Chapitre'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="moduleId">Module *</Label>
                  <Select
                    value={formData.moduleId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, moduleId: value }))}
                    disabled={editingChapter !== null}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          Module {module.order}: {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du Chapitre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Introduction aux fondements"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description du chapitre..."
                    rows={3}
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-orange-500 hover:bg-orange-600"
                    disabled={submitting}
                  >
                    {submitting ? 'Enregistrement...' : (editingChapter ? 'Mettre à jour' : 'Créer')}
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
                    placeholder="Rechercher par titre, description ou module..."
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Module</Label>
                    <Select value={selectedModule} onValueChange={setSelectedModule}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les modules</SelectItem>
                        {modules.map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            Module {module.order}: {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quiz</Label>
                    <Select value={hasQuizFilter} onValueChange={setHasQuizFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="with">Avec quiz</SelectItem>
                        <SelectItem value="without">Sans quiz</SelectItem>
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
              Liste des Chapitres ({filteredChapters.length}/{chapters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {chapters.length === 0 
                    ? "Aucun chapitre créé pour le moment."
                    : "Aucun chapitre ne correspond aux critères de recherche."
                  }
                </p>
                {activeFiltersCount > 0 && chapters.length > 0 && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Chapitre</TableHead>
                    <TableHead>Contenus</TableHead>
                    <TableHead>Durée totale</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Étudiants</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChapters.map((chapter) => (
                    <TableRow key={chapter.id}>
                      <TableCell>
                        <Badge variant="outline">
                          Module {chapter.module.order}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                          {chapter.module.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            Chapitre {chapter.order}: {chapter.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {chapter.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <Video className="w-4 h-4 mr-1 text-blue-500" />
                            <span className="text-sm">
                              {chapter.contents.filter(c => c.type === 'VIDEO').length}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Headphones className="w-4 h-4 mr-1 text-purple-500" />
                            <span className="text-sm">
                              {chapter.contents.filter(c => c.type === 'AUDIO').length}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {chapter._count.contents} total
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDuration(getTotalDuration(chapter.contents))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {chapter.quiz ? (
                          <Badge className="bg-green-100 text-green-800">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Configuré
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Aucun quiz
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {chapter._count.chapterProgress}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(chapter)}
                            title="Modifier le chapitre"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(chapter)}
                            className="text-red-600 hover:text-red-700"
                            title="Supprimer le chapitre"
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
                  Êtes-vous sûr de vouloir supprimer le chapitre{' '}
                  <span className="font-semibold">"{chapterToDelete?.title}"</span> ?
                </p>
                {chapterToDelete && (
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="font-medium">Module:</span> {chapterToDelete.module.title}
                      </div>
                      <div>
                        <span className="font-medium">Contenus:</span> {chapterToDelete._count.contents}
                      </div>
                      <div>
                        <span className="font-medium">Étudiants inscrits:</span> {chapterToDelete._count.chapterProgress}
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-red-600 font-medium">
                  Cette action est irréversible et supprimera également tous les contenus et quiz associés.
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