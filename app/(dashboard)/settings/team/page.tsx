'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, UserCog, Shield, User, Mail } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  toggleTeamMemberActive,
  type TeamMember,
} from '@/lib/actions/team'

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMembers = async () => {
    try {
      const data = await getTeamMembers()
      setMembers(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente teammedlemmer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateTeamMemberRole(memberId, newRole)
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
      toast.success('Rolle opdateret')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke opdatere rolle')
    }
  }

  const handleToggleActive = async (memberId: string, active: boolean) => {
    try {
      await toggleTeamMemberActive(memberId, active)
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, is_active: active } : m))
      )
      toast.success(active ? 'Bruger aktiveret' : 'Bruger deaktiveret')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kunne ikke opdatere status')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground">Administrer medarbejdere og roller</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <UserCog className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground">Administrer medarbejdere og roller</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4" />
          Inviter medarbejder
        </Button>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id} className={!member.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 shrink-0">
                    {member.role === 'admin' ? (
                      <Shield className="h-5 w-5 text-green-700" />
                    ) : (
                      <User className="h-5 w-5 text-green-700" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-h-[44px]"
                  >
                    <option value="admin">Admin</option>
                    <option value="medarbejder">Medarbejder</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Aktiv</span>
                    <button
                      onClick={() => handleToggleActive(member.id, !member.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        member.is_active ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          member.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter medarbejder</DialogTitle>
          </DialogHeader>
          <InviteForm
            onSuccess={() => {
              setInviteOpen(false)
              loadMembers()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InviteForm({ onSuccess }: { onSuccess: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('medarbejder')

  const handleSubmit = () => {
    if (!name || !email) return

    startTransition(async () => {
      try {
        await inviteTeamMember({ name, email, role })
        toast.success(`Invitation sendt til ${email}`)
        onSuccess()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Kunne ikke sende invitation')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Navn *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fulde navn" />
      </div>
      <div className="space-y-1">
        <Label>Email *</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@eksempel.dk" />
      </div>
      <div className="space-y-1">
        <Label>Rolle</Label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="medarbejder">Medarbejder</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={isPending || !name || !email}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isPending ? 'Sender...' : 'Send invitation'}
      </Button>
    </div>
  )
}
