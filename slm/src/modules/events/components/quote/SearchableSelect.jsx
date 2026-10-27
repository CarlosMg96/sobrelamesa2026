import React, { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Seleccionar...',
    onAddClick,
    disabled = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);
    const inputSearchRef = useRef(null);

    // Encontrar opción seleccionada
    const selectedOption = options.find(opt => String(opt.value) === String(value));

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus en input al abrir
    useEffect(() => {
        if (isOpen && inputSearchRef.current) {
            inputSearchRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = options.filter(opt =>
        String(opt.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(opt.secondaryLabel || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`d-flex align-items-center gap-1 w-100 ${className}`} ref={containerRef}>
            <div className="position-relative flex-grow-1">
                {/* Selector Box */}
                <div
                    className={`form-control d-flex justify-content-between align-items-center bg-white cursor-pointer ${disabled ? 'disabled bg-light' : ''}`}
                    style={{
                        minHeight: '38px',
                        borderRadius: '8px',
                        borderColor: '#e2e8f0',
                        fontSize: '0.875rem'
                    }}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <span className={`text-truncate ${!selectedOption ? 'text-muted' : 'text-dark fw-medium'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <i className={`bi bi-chevron-down text-muted small ms-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </div>

                {/* Dropdown Menu con Input de Búsqueda */}
                {isOpen && (
                    <div
                        className="position-absolute start-0 end-0 mt-1 bg-white border rounded-3 shadow-lg z-3"
                        style={{
                            maxHeight: '280px',
                            overflowY: 'hidden',
                            zIndex: 1050,
                            borderColor: '#cbd5e1'
                        }}
                    >
                        {/* Buscador interno */}
                        <div className="p-2 border-bottom bg-light">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="bi bi-search text-muted"></i>
                                </span>
                                <input
                                    ref={inputSearchRef}
                                    type="text"
                                    className="form-control border-start-0 shadow-none"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary border-start-0"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Opciones */}
                        <div style={{ maxHeight: '210px', overflowY: 'auto' }}>
                            {filteredOptions.length === 0 ? (
                                <div className="p-3 text-center text-muted small">
                                    No se encontraron resultados
                                </div>
                            ) : (
                                filteredOptions.map((opt) => (
                                    <div
                                        key={opt.value}
                                        className={`px-3 py-2 cursor-pointer border-bottom last:border-0 small d-flex flex-column ${
                                            String(opt.value) === String(value) ? 'bg-primary-subtle text-primary fw-bold' : 'hover-bg-light'
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleSelect(opt.value)}
                                    >
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span>{opt.label}</span>
                                            {String(opt.value) === String(value) && (
                                                <i className="bi bi-check-lg text-primary"></i>
                                            )}
                                        </div>
                                        {opt.secondaryLabel && (
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {opt.secondaryLabel}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Botón Verde "+" si aplica */}
            {onAddClick && (
                <button
                    type="button"
                    className="btn btn-outline-success d-flex align-items-center justify-content-center p-0 flex-shrink-0"
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        borderColor: '#10b981',
                        color: '#10b981'
                    }}
                    onClick={onAddClick}
                    title="Agregar nuevo"
                >
                    <i className="bi bi-plus-lg fs-5"></i>
                </button>
            )}
        </div>
    );
}
