import React from 'react';
import SearchableSelect from './SearchableSelect';
import { showAlert, showToast } from '../../../../shared/utils/alerts';

export default function GeneralDataCard({
    formState,
    setFormState,
    catalogs,
    onDateChange
}) {
    const { clients = [], agents = [], eventTypes = [], places = [], paymentTypes = [] } = catalogs;

    const handleInputChange = (field, value) => {
        setFormState(prev => ({ ...prev, [field]: value }));

        if (field === 'fecha_entrega' || field === 'fecha_recoleccion') {
            if (onDateChange) {
                onDateChange(field, value);
            }
        }
    };

    const handleClientChange = (clientId) => {
        const selected = clients.find(c => String(c.id) === String(clientId));
        setFormState(prev => ({
            ...prev,
            cliente_id: clientId,
            cliente_nombre: selected?.full_name || '',
            descuento: selected?.descuento_empresa ? Number(selected.descuento_empresa) : prev.descuento
        }));
    };

    // Opciones formateadas para SearchableSelect
    const clientOptions = clients.map(c => ({
        value: c.id,
        label: `${c.full_name || 'Sin nombre'} ${c.empresa ? `(${c.empresa})` : ''}`,
        secondaryLabel: c.num_tel ? `Tel: ${c.num_tel}` : ''
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
                            onAddClick={() => showAlert({
                                title: 'Nuevo Cliente',
                                text: 'El formulario de alta rápida de clientes se abrirá aquí.',
                                icon: 'info'
                            })}
                        />
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
                            onAddClick={() => showAlert({
                                title: 'Nuevo Domicilio',
                                text: 'El formulario para registrar un nuevo lugar frecuente se abrirá aquí.',
                                icon: 'info'
                            })}
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Domicilio Recolección
                        </label>
                        <SearchableSelect
                            options={placeOptions}
                            value={formState.domicilio_recoleccion}
                            onChange={(val) => handleInputChange('domicilio_recoleccion', val)}
                            onAddClick={() => {
                                handleInputChange('domicilio_recoleccion', formState.domicilio_entrega);
                                showToast('Domicilio copiado a recolección', 'info');
                            }}
                        />
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
        </div>
    );
}
