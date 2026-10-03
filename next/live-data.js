// Next beta only. Public client, existing RLS, no privileged keys.
window.ArchTimeNextData = (() => {
    const checked = async query => { const result = await query; if (result.error) throw result.error; return result.data; };
    async function clients() {
        const rows = await checked(supabaseClient.from('clients').select('*').eq('studio_id', userProfile.studio_id).order('name'));
        return rows.map(row => ({ ...row, taxCode: row.tax_code, vatNumber: row.vat_number }));
    }
    async function metadata() {
        const [rows, phases] = await Promise.all([
            checked(supabaseClient.from('projects').select('id,address,description,task_notes,billing_plan_enabled').eq('studio_id', userProfile.studio_id)),
            checked(supabaseClient.from('project_payment_phases').select('*').eq('studio_id', userProfile.studio_id).order('position'))
        ]);
        return new Map(rows.map(row => {
            const payments = phases.filter(phase => phase.project_id === row.id);
            const taskTranches = {};
            payments.forEach(phase => (phase.task_names || []).forEach(task => { taskTranches[task] = phase.id; }));
            return [row.id, { address: row.address || '', description: row.description || '', taskNotes: row.task_notes || {}, taskTranches,
                payments: payments.map(phase => ({ id: phase.id, label: phase.name, percent: Number(phase.percentage), status: phase.status, collectedAt: phase.collected_at, invoicedAt: phase.invoiced_at })) }];
        }));
    }
    async function saveMeta(id, meta) {
        await checked(supabaseClient.rpc('save_archtime_next_project_meta', { project_id_input: id, meta_input: meta }));
    }
    async function saveClient(record) {
        return checked(supabaseClient.from('clients').upsert({ id: record.id, studio_id: userProfile.studio_id, name: record.name,
            address: record.address, tax_code: record.taxCode, vat_number: record.vatNumber, email: record.email, phone: record.phone }).select().single());
    }
    async function deleteClient(id) {
        if (!await appConfirm('Elimina cliente', 'Eliminare il cliente dallo studio? La modifica è reale.', 'danger')) return false;
        await checked(supabaseClient.from('clients').delete().eq('id', id).eq('studio_id', userProfile.studio_id));
        return true;
    }
    return { clients, metadata, saveMeta, saveClient, deleteClient };
})();
