"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Briefcase,
  Search,
  Edit,
  Trash2,
  Target,
  Crown
} from "lucide-react"

interface TeamMember {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  created_at: string
}

interface CurrentUser {
  id: string
  email: string
  full_name: string
  role: string
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  
  // Form states for adding/editing
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "salesperson",
    phone: "",
    password: ""
  })

  const supabase = createClient()

  useEffect(() => {
    loadCurrentUser()
    loadTeamMembers()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          setCurrentUser(profile)
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading team members:', error)
        toast.error('Failed to load team members')
      } else {
        setTeamMembers(data || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!formData.email || !formData.full_name || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      })

      if (authError) {
        toast.error(`Failed to create user: ${authError.message}`)
        return
      }

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone || null
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
          toast.error('User created but profile setup failed')
        } else {
          toast.success('Team member added successfully')
          setShowAddDialog(false)
          resetForm()
          loadTeamMembers()
        }
      }
    } catch (error) {
      console.error('Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  }

  const handleEditMember = async () => {
    if (!selectedMember) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null
        })
        .eq('id', selectedMember.id)

      if (error) {
        toast.error('Failed to update team member')
      } else {
        toast.success('Team member updated successfully')
        setShowEditDialog(false)
        resetForm()
        loadTeamMembers()
      }
    } catch (error) {
      console.error('Error updating team member:', error)
      toast.error('Failed to update team member')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (memberId === currentUser?.id) {
      toast.error("You can't delete your own account")
      return
    }

    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', memberId)

      if (error) {
        toast.error('Failed to remove team member')
      } else {
        toast.success('Team member removed successfully')
        loadTeamMembers()
      }
    } catch (error) {
      console.error('Error deleting team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const openEditDialog = (member: TeamMember) => {
    setSelectedMember(member)
    setFormData({
      email: member.email,
      full_name: member.full_name,
      role: member.role,
      phone: member.phone || "",
      password: ""
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      role: "salesperson",
      phone: "",
      password: ""
    })
    setSelectedMember(null)
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      manager: { color: "bg-purple-100 text-purple-800", icon: Crown },
      salesperson: { color: "bg-blue-100 text-blue-800", icon: Briefcase },
      lead_hunter: { color: "bg-green-100 text-green-800", icon: Target },
      admin: { color: "bg-red-100 text-red-800", icon: Shield }
    }
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.salesperson
    const IconComponent = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)}
      </Badge>
    )
  }

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = searchTerm === "" || 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading team members...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-600">
            Manage your team members and their roles
          </p>
        </div>
        
        {isManager && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">{teamMembers.length}</p>
              <p className="text-sm text-slate-600">Total Members</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Crown className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {teamMembers.filter(m => m.role === 'manager').length}
              </p>
              <p className="text-sm text-slate-600">Managers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Briefcase className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {teamMembers.filter(m => m.role === 'salesperson').length}
              </p>
              <p className="text-sm text-slate-600">Salespersons</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Target className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {teamMembers.filter(m => m.role === 'lead_hunter').length}
              </p>
              <p className="text-sm text-slate-600">Lead Hunters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search team members..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No team members found
            </h3>
            <p className="text-slate-600">
              {teamMembers.length === 0 
                ? "Add your first team member to get started"
                : "Try adjusting your search terms"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{member.full_name}</CardTitle>
                    {getRoleBadge(member.role)}
                  </div>
                  
                  {isManager && member.id !== currentUser?.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                )}
                <div className="text-xs text-slate-400 pt-2">
                  Joined {new Date(member.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Team Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new team member account with specific role and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="team@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="lead_hunter">Lead Hunter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information and role.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                disabled
                className="bg-slate-50"
              />
            </div>
            
            <div>
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit_role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salesperson">Salesperson</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="lead_hunter">Lead Hunter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit_phone">Phone (Optional)</Label>
              <Input
                id="edit_phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditMember}>
              Update Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}