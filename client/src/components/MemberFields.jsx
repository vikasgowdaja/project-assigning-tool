export function MemberFields({ members, setMembers }) {
  const updateMember = (index, field, value) => {
    const nextMembers = [...members]
    nextMembers[index] = {
      ...nextMembers[index],
      [field]: value
    }
    setMembers(nextMembers)
  }

  const addMember = () => {
    if (members.length >= 6) {
      return
    }
    setMembers([...members, { name: '', usn: '', email: '' }])
  }

  const removeMember = (index) => {
    if (members.length <= 2) {
      return
    }
    setMembers(members.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Team Members</h3>
        <button
          type="button"
          onClick={addMember}
          className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-cyan-300"
        >
          Add Member
        </button>
      </div>
      {members.map((member, index) => (
        <div
          key={`member-${index}`}
          className="grid gap-3 rounded-xl border border-white/30 bg-white/10 p-4 md:grid-cols-6"
        >
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Member Name
            </label>
            <input
              required
              value={member.name}
              onChange={(event) =>
                updateMember(index, 'name', event.target.value)
              }
              className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
              placeholder="Enter member name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Member USN
            </label>
            <input
              required
              value={member.usn || ''}
              onChange={(event) =>
                updateMember(index, 'usn', event.target.value)
              }
              className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
              placeholder="1PE24CS001"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-100">
              Member Email
            </label>
            <input
              required
              type="email"
              value={member.email}
              onChange={(event) =>
                updateMember(index, 'email', event.target.value)
              }
              className="w-full rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-slate-100 placeholder:text-slate-300/70"
              placeholder="member@college.edu"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => removeMember(index)}
              className="w-full rounded-lg bg-rose-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-rose-300"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <p className="text-xs text-cyan-100/90">Minimum 2 and maximum 6 members.</p>
    </div>
  )
}
