import React, { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import { showToast } from '../../../../shared/utils/alerts';
import {
    createQuickClientService,
    createQuickCompanyService,
    createQuickPlaceService
} from '../../services/events.service';

export default function GeneralDataCard({
    formState,
    setFormState,
    catalogs,
    setCatalogs,
    onDateChange
}) {
    const {
        clients = [],
        agents = [],
        eventTypes = [],
        places = [],
        companies = [],
        clientTypes = [],
        paymentTypes = []
    } = catalogs;

    // Estado para modal de Nuevo Cliente (diseño legacy 3 columnas + mejoras UX)
    const [showClientModal, setShowClientModal] = useState(false);
    const [savingClient, setSavingClient] = useState(false);
    const [newClientForm, setNewClientForm] = useState({
        full_name: '',
        empresa_id: '',
        num_tel: '',
        email: '',
        tipo_cliente: '',
        rfc: '',
        direccion: '',
        agente_id: ''
    });

    // Estado para modal de Nueva Empresa (se abre desde el botón "+" junto a Empresa en Nuevo Cliente)
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [savingCompany, setSavingCompany] = useState(false);
    const [newCompanyForm, setNewCompanyForm] = useState({
        empresa: '',
        clave: '',
        agente_id: '',
        rfc: '',
        numero_empresa: '',
        direccion_empresa: '',
        descuento_empresa: '',
        forma_pago_autorizada: 1,
        tipo_empresa: '',
        notas: ''
    });

    // Estado para modal de Nuevo Domicilio / Lugar
    const [showPlaceModal, setShowPlaceModal] = useState(false);
    const [savingPlace, setSavingPlace] = useState(false);
    const [placeTargetField, setPlaceTargetField] = useState('domicilio_entrega');
    const [newPlaceForm, setNewPlaceForm] = useState({
        nombre: '',
        direccion: ''
    });

    const handleInputChange = (field, value) => {
        setFormState(prev => {
            const next = { ...prev, [field]: value };
            // UX: cuando se selecciona un Domicilio Entrega, se actualiza automáticamente en Domicilio Recolección
            if (field === 'domicilio_entrega') {
                next.domicilio_recoleccion = value;
            }
            // UX: si se selecciona Fecha Evento y Entrega/Recolección están vacías, pre-llenarlas
            if (field === 'fecha_evento' && value) {
                if (!prev.fecha_entrega) next.fecha_entrega = value;
                if (!prev.fecha_recoleccion) next.fecha_recoleccion = value;
            }
            return next;
        });

        if (field === 'fecha_entrega' || field === 'fecha_recoleccion') {
            if (onDateChange) {
                onDateChange(field, value);
            }
        }
    };

    const handleClientChange = (clientId) => {
        const selected = clients.find(c => String(c.id) === String(clientId));
        const companyDiscount = selected?.descuento_empresa ? Number(selected.descuento_empresa) : null;
        setFormState(prev => ({
            ...prev,
            cliente_id: clientId,
            cliente_nombre: selected?.full_name || '',
            num_tel: selected?.num_tel || '',
            email: selected?.email || '',
            empresa: selected?.empresa || '',
            descuento: companyDiscount !== null ? companyDiscount : prev.descuento
        }));
        if (companyDiscount && companyDiscount > 0) {
            showToast(`Descuento de empresa (${companyDiscount}%) aplicado`, 'info');
        }
    };

    const openNewClientModal = () => {
        setNewClientForm({
            full_name: '',
            empresa_id: '',
            num_tel: '',
            email: '',
            tipo_cliente: '',
            rfc: '',
            direccion: '',
            agente_id: formState.agente_id || ''
        });
        setShowClientModal(true);
    };

    const openNewCompanyModal = () => {
        setNewCompanyForm({
            empresa: '',
            clave: '',
            agente_id: newClientForm.agente_id || formState.agente_id || '',
            rfc: '',
            numero_empresa: '',
            direccion_empresa: '',
            descuento_empresa: '',
            forma_pago_autorizada: 1,
            tipo_empresa: '',
            notas: ''
        });
        setShowCompanyModal(true);
    };

    const handleSaveQuickClient = async (e) => {
        e.preventDefault();
        if (!newClientForm.full_name.trim()) {
            showToast('El nombre completo del cliente es obligatorio', 'warning');
            return;
        }

        setSavingClient(true);
        try {
            const res = await createQuickClientService({
                full_name: newClientForm.full_name.trim(),
                empresa_id: newClientForm.empresa_id ? Number(newClientForm.empresa_id) : 1,
                num_tel: newClientForm.num_tel.trim(),
                email: newClientForm.email.trim(),
                tipo_cliente: newClientForm.tipo_cliente ? Number(newClientForm.tipo_cliente) : 1,
                rfc: newClientForm.rfc.trim().toUpperCase(),
                direccion: newClientForm.direccion.trim(),
                agente_id: newClientForm.agente_id ? Number(newClientForm.agente_id) : (Number(formState.agente_id) || null)
            });

            if (res?.data) {
                const created = res.data;
                if (setCatalogs) {
                    setCatalogs(prev => ({
                        ...prev,
                        clients: [created, ...(prev.clients || [])]
                    }));
                }
                const companyDiscount = created.descuento_empresa ? Number(created.descuento_empresa) : null;
                setFormState(prev => ({
                    ...prev,
                    cliente_id: created.id,
                    cliente_nombre: created.full_name || newClientForm.full_name.trim(),
                    num_tel: created.num_tel || newClientForm.num_tel.trim(),
                    email: created.email || newClientForm.email.trim(),
                    empresa: created.empresa || '',
                    descuento: companyDiscount !== null ? companyDiscount : prev.descuento
                }));
                setShowClientModal(false);
                showToast('Cliente registrado y seleccionado', 'success');
            }
        } catch (err) {
            console.error('Error registrando cliente:', err);
            showToast('Error al registrar el cliente', 'error');
        } finally {
            setSavingClient(false);
        }
    };

    const handleSaveQuickCompany = async (e) => {
        e.preventDefault();
        if (!newCompanyForm.empresa.trim()) {
            showToast('El nombre de la empresa es obligatorio', 'warning');
            return;
        }

        setSavingCompany(true);
        try {
            const res = await createQuickCompanyService({
                empresa: newCompanyForm.empresa.trim(),
                clave: newCompanyForm.clave.trim().toUpperCase(),
                agente_id: newCompanyForm.agente_id ? Number(newCompanyForm.agente_id) : (Number(formState.agente_id) || null),
                rfc: newCompanyForm.rfc.trim().toUpperCase(),
                numero_empresa: newCompanyForm.numero_empresa.trim(),
                direccion_empresa: newCompanyForm.direccion_empresa.trim(),
                descuento_empresa: Number(newCompanyForm.descuento_empresa) || 0,
                forma_pago_autorizada: Number(newCompanyForm.forma_pago_autorizada) || 1,
                tipo_empresa: newCompanyForm.tipo_empresa ? Number(newCompanyForm.tipo_empresa) : 1,
                notas: newCompanyForm.notas.trim()
            });

            if (res?.data) {
                const createdCompany = res.data;
                if (setCatalogs) {
                    setCatalogs(prev => ({
                        ...prev,
                        companies: [createdCompany, ...(prev.companies || [])]
                    }));
                }
                setNewClientForm(prev => ({
                    ...prev,
                    empresa_id: createdCompany.id,
                    ...(createdCompany.rfc && !prev.rfc ? { rfc: createdCompany.rfc } : {}),
                    ...(createdCompany.direccion_empresa && !prev.direccion ? { direccion: createdCompany.direccion_empresa } : {})
                }));
                setShowCompanyModal(false);
                showToast(`Empresa "${createdCompany.empresa}" registrada y seleccionada`, 'success');
            }
        } catch (err) {
            console.error('Error registrando empresa:', err);
            showToast('Error al registrar la empresa', 'error');
        } finally {
            setSavingCompany(false);
        }
    };

    const handleSaveQuickPlace = async (e) => {
        e.preventDefault();
        if (!newPlaceForm.nombre.trim() || !newPlaceForm.direccion.trim()) {
            showToast('El nombre y la dirección del domicilio son obligatorios', 'warning');
            return;
        }

        setSavingPlace(true);
        try {
            const res = await createQuickPlaceService({
                nombre: newPlaceForm.nombre.trim(),
                direccion: newPlaceForm.direccion.trim()
            });

            if (res?.data) {
                const created = res.data;
                if (setCatalogs) {
                    setCatalogs(prev => ({
                        ...prev,
                        places: [created, ...(prev.places || [])]
                    }));
                }
                // Si se creó desde Domicilio Entrega, actualizar tanto Entrega como Recolección
                setFormState(prev => ({
                    ...prev,
                    [placeTargetField]: created.nombre,
                    ...(placeTargetField === 'domicilio_entrega'
                        ? { domicilio_recoleccion: created.nombre }
                        : {})
                }));
                setShowPlaceModal(false);
                setNewPlaceForm({ nombre: '', direccion: '' });
                showToast('Domicilio registrado y asignado', 'success');
            }
        } catch (err) {
            console.error('Error registrando domicilio:', err);
            showToast('Error al registrar el domicilio', 'error');
        } finally {
            setSavingPlace(false);
        }
    };

    // Opciones formateadas para SearchableSelect
    const clientOptions = clients.map(c => ({
        value: c.id,
        label: `${c.full_name || 'Sin nombre'} ${c.empresa ? `(${c.empresa})` : ''}`,
        secondaryLabel: [c.num_tel ? `Tel: ${c.num_tel}` : '', c.email || ''].filter(Boolean).join(' • ')
    }));

    const companyOptions = companies.map(emp => ({
        value: emp.id,
        label: emp.empresa,
        secondaryLabel: [
            emp.clave_empresa ? `Clave: ${emp.clave_empresa}` : '',
            emp.descuento_empresa ? `Desc: ${emp.descuento_empresa}%` : ''
        ].filter(Boolean).join(' • ')
    }));

    const agentOptions = agents.map(a => ({
        value: a.id,
        label: a.name,
        secondaryLabel: a.email
    }));

    const eventTypeOptions = eventTypes.map(t => ({
        value: t.id,
        label: t.evento
    }));

    const placeOptions = places.map(p => ({
        value: p.nombre,
        label: p.nombre,
        secondaryLabel: p.direccion
    }));

    const paymentTypeOptions = paymentTypes.map(p => ({
        value: p.id,
        label: p.name
    }));

    // Datos informativos de contexto (UX)
    const selectedClientObj = clients.find(c => String(c.id) === String(formState.cliente_id));
    const selectedDeliveryPlaceObj = places.find(p => p.nombre === formState.domicilio_entrega);
    const selectedCollectionPlaceObj = places.find(p => p.nombre === formState.domicilio_recoleccion);

    return (
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '16px' }}>
            <div className="card-body p-4">
                {/* Título de la tarjeta */}
                <h5 className="fw-bold mb-4 d-flex align-items-center gap-2" style={{ color: '#0d6efd' }}>
                    <i className="bi bi-file-earmark-text-fill"></i>
                    Datos Generales y Logística
                </h5>

                {/* Fila 1: Fecha de Cotización | Cliente [+] | Agente */}
                <div className="row g-3 mb-3">
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Fecha de Cotización
                        </label>
                        <div className="input-group">
                            <input
                                type="date"
                                className="form-control"
                                style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.fecha_cotizacion || ''}
                                onChange={(e) => handleInputChange('fecha_cotizacion', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Cliente <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                            options={clientOptions}
                            value={formState.cliente_id}
                            onChange={handleClientChange}
                            placeholder="Buscar y seleccionar cliente..."
                            onAddClick={openNewClientModal}
                        />
                        {selectedClientObj && (selectedClientObj.num_tel || selectedClientObj.email || selectedClientObj.empresa) && (
                            <div className="d-flex flex-wrap align-items-center gap-2 mt-1 small text-muted" style={{ fontSize: '0.75rem' }}>
                                {selectedClientObj.num_tel && (
                                    <span><i className="bi bi-telephone me-1"></i>{selectedClientObj.num_tel}</span>
                                )}
                                {selectedClientObj.email && (
                                    <span className="text-truncate" style={{ maxWidth: '180px' }}>
                                        <i className="bi bi-envelope me-1"></i>{selectedClientObj.email}
                                    </span>
                                )}
                                {Number(selectedClientObj.descuento_empresa) > 0 && (
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                        Desc. {selectedClientObj.descuento_empresa}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Agente <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                            options={agentOptions}
                            value={formState.agente_id}
                            onChange={(val) => handleInputChange('agente_id', val)}
                            placeholder="Seleccionar agente..."
                        />
                    </div>
                </div>

                {/* Fila 2: Tipo Evento | Número Personas */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Tipo Evento
                        </label>
                        <SearchableSelect
                            options={eventTypeOptions}
                            value={formState.tipo_evento}
                            onChange={(val) => handleInputChange('tipo_evento', val)}
                            placeholder="Seleccionar tipo de evento..."
                        />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Número Personas
                        </label>
                        <input
                            type="number"
                            min="0"
                            className="form-control"
                            style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                            placeholder="0"
                            value={formState.no_personas !== undefined ? formState.no_personas : ''}
                            onChange={(e) => handleInputChange('no_personas', e.target.value)}
                        />
                    </div>
                </div>

                {/* Subsección: Domicilios */}
                <h6 className="fw-bold mb-3" style={{ color: '#0d6efd' }}>
                    Domicilios
                </h6>

                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Domicilio Entrega
                        </label>
                        <SearchableSelect
                            options={placeOptions}
                            value={formState.domicilio_entrega}
                            onChange={(val) => handleInputChange('domicilio_entrega', val)}
                            placeholder="Bodega de Sobre La Mesa o buscar lugar..."
                            onAddClick={() => {
                                setPlaceTargetField('domicilio_entrega');
                                setShowPlaceModal(true);
                            }}
                        />
                        {selectedDeliveryPlaceObj?.direccion && (
                            <div className="small text-muted mt-1 text-truncate" style={{ fontSize: '0.75rem' }} title={selectedDeliveryPlaceObj.direccion}>
                                <i className="bi bi-geo-alt text-primary me-1"></i>
                                {selectedDeliveryPlaceObj.direccion}
                            </div>
                        )}
                    </div>

                    <div className="col-md-6">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-semibold text-secondary mb-0">
                                Domicilio Recolección
                            </label>
                            {formState.domicilio_entrega && formState.domicilio_recoleccion !== formState.domicilio_entrega && (
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 text-decoration-none small"
                                    style={{ fontSize: '0.75rem' }}
                                    onClick={() => handleInputChange('domicilio_recoleccion', formState.domicilio_entrega)}
                                >
                                    <i className="bi bi-arrow-left-right me-1"></i>Usar mismo de entrega
                                </button>
                            )}
                        </div>
                        <SearchableSelect
                            options={placeOptions}
                            value={formState.domicilio_recoleccion}
                            onChange={(val) => handleInputChange('domicilio_recoleccion', val)}
                            placeholder="Bodega de Sobre La Mesa o buscar lugar..."
                            onAddClick={() => {
                                setPlaceTargetField('domicilio_recoleccion');
                                setShowPlaceModal(true);
                            }}
                        />
                        {selectedCollectionPlaceObj?.direccion && (
                            <div className="small text-muted mt-1 text-truncate" style={{ fontSize: '0.75rem' }} title={selectedCollectionPlaceObj.direccion}>
                                <i className="bi bi-geo-alt text-primary me-1"></i>
                                {selectedCollectionPlaceObj.direccion}
                            </div>
                        )}
                    </div>
                </div>

                {/* Subsección: Fechas: */}
                <h6 className="fw-bold mb-3" style={{ color: '#0d6efd' }}>
                    Fechas:
                </h6>

                <div className="row g-3 mb-4">
                    {/* Fecha Evento */}
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Fecha Evento
                        </label>
                        <div className="d-flex gap-2">
                            <input
                                type="date"
                                className="form-control"
                                style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.fecha_evento || ''}
                                onChange={(e) => handleInputChange('fecha_evento', e.target.value)}
                            />
                            <div className="input-group" style={{ maxWidth: '140px' }}>
                                <input
                                    type="time"
                                    className="form-control"
                                    style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                    value={formState.hora_evento || ''}
                                    onChange={(e) => handleInputChange('hora_evento', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fecha Entrega */}
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Fecha Entrega
                        </label>
                        <div className="d-flex gap-2 mb-2">
                            <input
                                type="date"
                                className="form-control"
                                style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.fecha_entrega || ''}
                                onChange={(e) => handleInputChange('fecha_entrega', e.target.value)}
                            />
                            <select
                                className="form-select"
                                style={{ maxWidth: '140px', borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.tipo_horario_entrega || 'ESPECIFICO'}
                                onChange={(e) => handleInputChange('tipo_horario_entrega', e.target.value)}
                            >
                                <option value="ESPECIFICO">Específico</option>
                                <option value="RANGO">Rango</option>
                                <option value="ABIERTO">Abierto</option>
                            </select>
                        </div>
                        <div className="d-flex gap-2">
                            <div className="input-group" style={{ maxWidth: '140px' }}>
                                <input
                                    type="time"
                                    className="form-control"
                                    style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                    value={formState.hora_entrega || ''}
                                    onChange={(e) => handleInputChange('hora_entrega', e.target.value)}
                                />
                            </div>
                            {formState.tipo_horario_entrega === 'RANGO' && (
                                <div className="input-group" style={{ maxWidth: '140px' }}>
                                    <input
                                        type="time"
                                        className="form-control"
                                        style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                        value={formState.hora_entrega_fin || ''}
                                        onChange={(e) => handleInputChange('hora_entrega_fin', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fecha Recolección */}
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Fecha Recolección
                        </label>
                        <div className="d-flex gap-2 mb-2">
                            <input
                                type="date"
                                className="form-control"
                                style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.fecha_recoleccion || ''}
                                onChange={(e) => handleInputChange('fecha_recoleccion', e.target.value)}
                            />
                            <select
                                className="form-select"
                                style={{ maxWidth: '140px', borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                value={formState.tipo_horario_recoleccion || 'ESPECIFICO'}
                                onChange={(e) => handleInputChange('tipo_horario_recoleccion', e.target.value)}
                            >
                                <option value="ESPECIFICO">Específico</option>
                                <option value="RANGO">Rango</option>
                                <option value="ABIERTO">Abierto</option>
                            </select>
                        </div>
                        <div className="d-flex gap-2">
                            <div className="input-group" style={{ maxWidth: '140px' }}>
                                <input
                                    type="time"
                                    className="form-control"
                                    style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                    value={formState.hora_recoleccion || ''}
                                    onChange={(e) => handleInputChange('hora_recoleccion', e.target.value)}
                                />
                            </div>
                            {formState.tipo_horario_recoleccion === 'RANGO' && (
                                <div className="input-group" style={{ maxWidth: '140px' }}>
                                    <input
                                        type="time"
                                        className="form-control"
                                        style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                                        value={formState.hora_recoleccion_fin || ''}
                                        onChange={(e) => handleInputChange('hora_recoleccion_fin', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subsección: Extras: */}
                <h6 className="fw-bold mb-3" style={{ color: '#0d6efd' }}>
                    Extras:
                </h6>

                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Forma de pago autorizada
                        </label>
                        <SearchableSelect
                            options={paymentTypeOptions}
                            value={formState.tipo_pago || 7}
                            onChange={(val) => handleInputChange('tipo_pago', Number(val))}
                            placeholder="De Contado..."
                        />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Descuento extra
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="form-control"
                            style={{ borderRadius: '8px', borderColor: '#e2e8f0', minHeight: '38px', fontSize: '0.875rem' }}
                            value={formState.descuento !== undefined ? formState.descuento : 0}
                            onChange={(e) => handleInputChange('descuento', Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            {/* Modal: Nuevo Cliente (idéntico a img1: 3 columnas + botón "+" para crear Empresa) */}
            {showClientModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg">
                            <form onSubmit={handleSaveQuickClient}>
                                <div className="modal-header border-bottom px-4 py-3">
                                    <h5 className="modal-title fw-bold mb-0">
                                        Nuevo Cliente
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowClientModal(false)}
                                    ></button>
                                </div>

                                <div className="modal-body p-4">
                                    {/* Fila 1: Nombre Completo | Empresa [+] | Celular */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Nombre Completo <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                value={newClientForm.full_name}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, full_name: e.target.value }))}
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Empresa
                                            </label>
                                            <SearchableSelect
                                                options={companyOptions}
                                                value={newClientForm.empresa_id}
                                                onChange={(val) => setNewClientForm(prev => ({ ...prev, empresa_id: val }))}
                                                placeholder="Seleccionar empresa"
                                                onAddClick={openNewCompanyModal}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Celular
                                            </label>
                                            <input
                                                type="tel"
                                                className="form-control rounded-3"
                                                value={newClientForm.num_tel}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, num_tel: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 2: Correo Electrónico | Tipo Cliente | RFC */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Correo Electrónico
                                            </label>
                                            <input
                                                type="email"
                                                className="form-control rounded-3"
                                                value={newClientForm.email}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Tipo Cliente
                                            </label>
                                            <select
                                                className="form-select rounded-3"
                                                value={newClientForm.tipo_cliente}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, tipo_cliente: e.target.value }))}
                                            >
                                                <option value="">Seleccione el tipo de cliente</option>
                                                {clientTypes.map(ct => (
                                                    <option key={ct.id} value={ct.id}>
                                                        {ct.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                RFC
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3 text-uppercase"
                                                maxLength="13"
                                                value={newClientForm.rfc}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 3: Dirección | Table Solver */}
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Dirección
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                value={newClientForm.direccion}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, direccion: e.target.value }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Table Solver
                                            </label>
                                            <select
                                                className="form-select rounded-3"
                                                value={newClientForm.agente_id}
                                                onChange={(e) => setNewClientForm(prev => ({ ...prev, agente_id: e.target.value }))}
                                            >
                                                <option value="">Seleccionar agente</option>
                                                {agents.map(ag => (
                                                    <option key={ag.id} value={ag.id}>
                                                        {ag.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-light rounded-pill px-4 fw-semibold border"
                                        onClick={() => setShowClientModal(false)}
                                        disabled={savingClient}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill px-4 fw-semibold"
                                        disabled={savingClient}
                                    >
                                        {savingClient ? 'Registrando...' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Nueva Empresa (idéntico a img2: 3 columnas + Notas) */}
            {showCompanyModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(4px)', zIndex: 1070 }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg">
                            <form onSubmit={handleSaveQuickCompany}>
                                <div className="modal-header border-bottom px-4 py-3">
                                    <h5 className="modal-title fw-bold mb-0">
                                        Nueva Empresa
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowCompanyModal(false)}
                                    ></button>
                                </div>

                                <div className="modal-body p-4">
                                    {/* Fila 1: Empresa | Clave | Table Solver */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Empresa <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                value={newCompanyForm.empresa}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // UX: sugerir clave con iniciales si el usuario aún no edita la clave manualmente
                                                    const autoClave = val
                                                        .trim()
                                                        .split(/\s+/)
                                                        .filter(Boolean)
                                                        .map(w => w[0])
                                                        .join('')
                                                        .toUpperCase()
                                                        .slice(0, 6);
                                                    setNewCompanyForm(prev => ({
                                                        ...prev,
                                                        empresa: val,
                                                        clave: prev.clave === '' || prev._autoClave ? autoClave : prev.clave,
                                                        _autoClave: prev.clave === '' || prev._autoClave
                                                    }));
                                                }}
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Clave
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3 text-uppercase"
                                                value={newCompanyForm.clave}
                                                onChange={(e) => setNewCompanyForm(prev => ({
                                                    ...prev,
                                                    clave: e.target.value.toUpperCase(),
                                                    _autoClave: false
                                                }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Table Solver
                                            </label>
                                            <select
                                                className="form-select rounded-3"
                                                value={newCompanyForm.agente_id}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, agente_id: e.target.value }))}
                                            >
                                                <option value="">Seleccionar agente</option>
                                                {agents.map(ag => (
                                                    <option key={ag.id} value={ag.id}>
                                                        {ag.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Fila 2: RFC | Número Empresa | Dirección de la Empresa */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                RFC
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3 text-uppercase"
                                                maxLength="13"
                                                value={newCompanyForm.rfc}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Número Empresa
                                            </label>
                                            <input
                                                type="tel"
                                                className="form-control rounded-3"
                                                value={newCompanyForm.numero_empresa}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, numero_empresa: e.target.value }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Dirección de la Empresa
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control rounded-3"
                                                value={newCompanyForm.direccion_empresa}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, direccion_empresa: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Fila 3: Descuento de la empresa ("Solo número") | Forma de Pago Autorizada | Tipo Empresa */}
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Descuento de la empresa ("Solo número")
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="form-control rounded-3"
                                                value={newCompanyForm.descuento_empresa}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, descuento_empresa: e.target.value }))}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Forma de Pago Autorizada
                                            </label>
                                            <select
                                                className="form-select rounded-3"
                                                value={newCompanyForm.forma_pago_autorizada}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, forma_pago_autorizada: e.target.value }))}
                                            >
                                                {paymentTypes.map(pt => (
                                                    <option key={pt.id} value={pt.id}>
                                                        {pt.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold mb-1">
                                                Tipo Empresa
                                            </label>
                                            <select
                                                className="form-select rounded-3"
                                                value={newCompanyForm.tipo_empresa}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, tipo_empresa: e.target.value }))}
                                            >
                                                <option value="">Seleccione el tipo de empresa</option>
                                                {clientTypes.map(ct => (
                                                    <option key={ct.id} value={ct.id}>
                                                        {ct.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Fila 4: Notas */}
                                    <div className="row g-3">
                                        <div className="col-12">
                                            <label className="form-label small fw-semibold mb-1">
                                                Notas
                                            </label>
                                            <textarea
                                                className="form-control rounded-3"
                                                rows="3"
                                                value={newCompanyForm.notas}
                                                onChange={(e) => setNewCompanyForm(prev => ({ ...prev, notas: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-light rounded-pill px-4 fw-semibold border"
                                        onClick={() => setShowCompanyModal(false)}
                                        disabled={savingCompany}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill px-4 fw-semibold"
                                        disabled={savingCompany}
                                    >
                                        {savingCompany ? 'Registrando...' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Alta Rápida de Nuevo Domicilio / Lugar */}
            {showPlaceModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content rounded-4 border-0 shadow-lg">
                            <form onSubmit={handleSaveQuickPlace}>
                                <div className="modal-header border-bottom px-4 py-3">
                                    <h5 className="modal-title fw-bold mb-0">
                                        Nuevo Domicilio / Lugar
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowPlaceModal(false)}
                                    ></button>
                                </div>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold mb-1">
                                            Nombre del Lugar / Domicilio <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control rounded-3"
                                            placeholder="Ej. Hacienda Santa Mónica"
                                            value={newPlaceForm.nombre}
                                            onChange={(e) => setNewPlaceForm(prev => ({ ...prev, nombre: e.target.value }))}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label small fw-semibold mb-1">
                                            Dirección Completa <span className="text-danger">*</span>
                                        </label>
                                        <textarea
                                            className="form-control rounded-3"
                                            rows="3"
                                            placeholder="Calle, número, colonia, código postal, alcaldía/municipio, ciudad..."
                                            value={newPlaceForm.direccion}
                                            onChange={(e) => setNewPlaceForm(prev => ({ ...prev, direccion: e.target.value }))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-end gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-light rounded-pill px-4 fw-semibold border"
                                        onClick={() => setShowPlaceModal(false)}
                                        disabled={savingPlace}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary rounded-pill px-4 fw-semibold"
                                        disabled={savingPlace}
                                    >
                                        {savingPlace ? 'Registrando...' : 'Registrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
