'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft, FiCheck, FiUpload, FiInfo } from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

// Tipos de datos
interface FormData {
  nombreCompleto: string;
  email: string;
  telefono: string;
  numeroColegiado: string;
  especialidades: string[];
  experienciaAnios: string;
  disponibilidad: string[];
  motivacion: string;
  cv: File | null;
  titulacion: File | null;
  aceptaTerminos: boolean;
}

export default function RegistroAbogadosPage() {
  // Estado inicial del formulario
  const [formData, setFormData] = useState<FormData>({
    nombreCompleto: '',
    email: '',
    telefono: '',
    numeroColegiado: '',
    especialidades: [],
    experienciaAnios: '',
    disponibilidad: [],
    motivacion: '',
    cv: null,
    titulacion: null,
    aceptaTerminos: false,
  });

  // Estado para errores del formulario
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estado para el proceso de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Opciones para especialidades legales
  const especialidadesOpciones = [
    'Derecho Civil',
    'Derecho Penal',
    'Derecho Mercantil',
    'Derecho Laboral',
    'Derecho Administrativo',
    'Derecho Fiscal',
    'Derecho de Familia',
    'Derecho Inmobiliario',
    'Propiedad Intelectual',
    'Derecho Internacional',
    'Derecho Ambiental',
    'Otra',
  ];

  // Opciones para disponibilidad
  const disponibilidadOpciones = [
    'Lunes a Viernes (mañanas)',
    'Lunes a Viernes (tardes)',
    'Fines de semana',
    'Horario flexible',
    'Tiempo completo',
    'Tiempo parcial',
  ];

  // Manejador de cambio en los campos del formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // Manejador para checkboxes múltiples (especialidades, disponibilidad)
  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'especialidades' | 'disponibilidad'
  ) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        [field]: [...formData[field], value],
      });
    } else {
      setFormData({
        ...formData,
        [field]: formData[field].filter((item) => item !== value),
      });
    }
    
    // Limpiar error cuando el usuario selecciona opciones
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };

  // Manejador para archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cv' | 'titulacion') => {
    const file = e.target.files?.[0] || null;
    
    setFormData({
      ...formData,
      [field]: file,
    });
    
    // Limpiar error cuando el usuario sube un archivo
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: '',
      });
    }
  };

  // Validación del formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validaciones básicas
    if (!formData.nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'El nombre completo es obligatorio';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio';
    }
    
    if (!formData.numeroColegiado.trim()) {
      newErrors.numeroColegiado = 'El número de colegiado es obligatorio';
    }
    
    if (formData.especialidades.length === 0) {
      newErrors.especialidades = 'Selecciona al menos una especialidad';
    }
    
    if (!formData.experienciaAnios) {
      newErrors.experienciaAnios = 'Indica tus años de experiencia';
    }
    
    if (formData.disponibilidad.length === 0) {
      newErrors.disponibilidad = 'Selecciona al menos una opción de disponibilidad';
    }
    
    if (!formData.motivacion.trim()) {
      newErrors.motivacion = 'Este campo es obligatorio';
    } else if (formData.motivacion.length < 100) {
      newErrors.motivacion = 'La respuesta debe tener al menos 100 caracteres';
    }
    
    if (!formData.cv) {
      newErrors.cv = 'Debes adjuntar tu CV';
    }
    
    if (!formData.titulacion) {
      newErrors.titulacion = 'Debes adjuntar tu titulación';
    }
    
    if (!formData.aceptaTerminos) {
      newErrors.aceptaTerminos = 'Debes aceptar los términos y condiciones';
    }
    
    return newErrors;
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll al primer error
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Aquí iría la llamada a la API para enviar el formulario
      // Por ahora, simulamos una respuesta exitosa después de 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulación de éxito
      setSubmitSuccess(true);
      
      // Scroll al inicio para mostrar el mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setErrors({
        form: 'Ocurrió un error al enviar el formulario. Por favor, inténtalo de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image 
              src={logo} 
              alt="VirtuAbogado Logo" 
              width={180} 
              height={60} 
              className="mx-auto"
            />
          </Link>
          
          <Link href="/" className="inline-flex items-center text-azul-primario hover:text-azul-primario/80 mt-4">
            <FiArrowLeft className="mr-2" /> Volver al inicio
          </Link>
        </div>
        
        {submitSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow-md rounded-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada con éxito!</h2>
            <p className="text-gray-600 mb-6">
              Hemos recibido tu solicitud para formar parte de nuestro equipo de abogados. Revisaremos tu información y nos pondremos en contacto contigo en los próximos días para informarte sobre los siguientes pasos.
            </p>
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
              >
                Volver al inicio
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="bg-white shadow-md rounded-xl overflow-hidden">
              <div className="p-8">
                <h1 className="text-2xl font-bold text-azul-primario mb-2">Registro de Abogados</h1>
                <p className="text-gray-600 mb-6">
                  Completa el siguiente formulario para solicitar unirte a nuestra plataforma como abogado. Revisaremos tu información y nos pondremos en contacto contigo para los siguientes pasos.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Información personal */}
                  <div>
                    <h2 className="text-lg font-semibold text-azul-primario mb-4 pb-2 border-b border-gray-200">
                      Información Personal
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="nombreCompleto" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre completo *
                        </label>
                        <input
                          type="text"
                          id="nombreCompleto"
                          name="nombreCompleto"
                          value={formData.nombreCompleto}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2 border ${
                            errors.nombreCompleto ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                        />
                        {errors.nombreCompleto && (
                          <p className="mt-1 text-sm text-red-600">{errors.nombreCompleto}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email profesional *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2 border ${
                            errors.email ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono de contacto *
                        </label>
                        <input
                          type="tel"
                          id="telefono"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2 border ${
                            errors.telefono ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                        />
                        {errors.telefono && (
                          <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="numeroColegiado" className="block text-sm font-medium text-gray-700 mb-1">
                          Número de colegiado *
                        </label>
                        <input
                          type="text"
                          id="numeroColegiado"
                          name="numeroColegiado"
                          value={formData.numeroColegiado}
                          onChange={handleInputChange}
                          className={`block w-full px-3 py-2 border ${
                            errors.numeroColegiado ? 'border-red-300' : 'border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                        />
                        {errors.numeroColegiado && (
                          <p className="mt-1 text-sm text-red-600">{errors.numeroColegiado}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Experiencia profesional */}
                  <div>
                    <h2 className="text-lg font-semibold text-azul-primario mb-4 pb-2 border-b border-gray-200">
                      Experiencia Profesional
                    </h2>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Especialidades legales *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {especialidadesOpciones.map((especialidad) => (
                          <div key={especialidad} className="flex items-start">
                            <input
                              id={`especialidad-${especialidad}`}
                              name={`especialidad-${especialidad}`}
                              type="checkbox"
                              value={especialidad}
                              checked={formData.especialidades.includes(especialidad)}
                              onChange={(e) => handleCheckboxChange(e, 'especialidades')}
                              className="h-4 w-4 text-azul-primario border-gray-300 rounded mt-1"
                            />
                            <label
                              htmlFor={`especialidad-${especialidad}`}
                              className="ml-2 block text-sm text-gray-700"
                            >
                              {especialidad}
                            </label>
                          </div>
                        ))}
                      </div>
                      {errors.especialidades && (
                        <p className="mt-1 text-sm text-red-600">{errors.especialidades}</p>
                      )}
                    </div>
                    
                    <div className="mb-6">
                      <label htmlFor="experienciaAnios" className="block text-sm font-medium text-gray-700 mb-1">
                        Años de experiencia profesional *
                      </label>
                      <select
                        id="experienciaAnios"
                        name="experienciaAnios"
                        value={formData.experienciaAnios}
                        onChange={handleInputChange}
                        className={`block w-full px-3 py-2 border ${
                          errors.experienciaAnios ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="0-2">Menos de 2 años</option>
                        <option value="3-5">3-5 años</option>
                        <option value="6-10">6-10 años</option>
                        <option value="11-15">11-15 años</option>
                        <option value="16+">Más de 15 años</option>
                      </select>
                      {errors.experienciaAnios && (
                        <p className="mt-1 text-sm text-red-600">{errors.experienciaAnios}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disponibilidad para atender consultas *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {disponibilidadOpciones.map((opcion) => (
                          <div key={opcion} className="flex items-start">
                            <input
                              id={`disponibilidad-${opcion}`}
                              name={`disponibilidad-${opcion}`}
                              type="checkbox"
                              value={opcion}
                              checked={formData.disponibilidad.includes(opcion)}
                              onChange={(e) => handleCheckboxChange(e, 'disponibilidad')}
                              className="h-4 w-4 text-azul-primario border-gray-300 rounded mt-1"
                            />
                            <label
                              htmlFor={`disponibilidad-${opcion}`}
                              className="ml-2 block text-sm text-gray-700"
                            >
                              {opcion}
                            </label>
                          </div>
                        ))}
                      </div>
                      {errors.disponibilidad && (
                        <p className="mt-1 text-sm text-red-600">{errors.disponibilidad}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Motivación */}
                  <div>
                    <h2 className="text-lg font-semibold text-azul-primario mb-4 pb-2 border-b border-gray-200">
                      Motivación
                    </h2>
                    
                    <div>
                      <label htmlFor="motivacion" className="block text-sm font-medium text-gray-700 mb-1">
                        ¿Por qué te gustaría formar parte de nuestra plataforma? *
                      </label>
                      <textarea
                        id="motivacion"
                        name="motivacion"
                        rows={5}
                        value={formData.motivacion}
                        onChange={handleInputChange}
                        placeholder="Cuéntanos por qué te interesa unirte a VirtuAbogado y qué valor puedes aportar a nuestros usuarios..."
                        className={`block w-full px-3 py-2 border ${
                          errors.motivacion ? 'border-red-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Mínimo 100 caracteres. {formData.motivacion.length}/100
                      </p>
                      {errors.motivacion && (
                        <p className="mt-1 text-sm text-red-600">{errors.motivacion}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Documentación */}
                  <div>
                    <h2 className="text-lg font-semibold text-azul-primario mb-4 pb-2 border-b border-gray-200">
                      Documentación
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currículum Vitae *
                        </label>
                        <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                          errors.cv ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <div className="space-y-1 text-center">
                            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="cv"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-azul-primario hover:text-azul-primario/80 focus-within:outline-none"
                              >
                                <span>Subir archivo</span>
                                <input
                                  id="cv"
                                  name="cv"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => handleFileChange(e, 'cv')}
                                  className="sr-only"
                                />
                              </label>
                              <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PDF, DOC o DOCX hasta 5MB
                            </p>
                            {formData.cv && (
                              <p className="text-sm text-azul-primario">
                                {formData.cv.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {errors.cv && (
                          <p className="mt-1 text-sm text-red-600">{errors.cv}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Titulación en Derecho *
                        </label>
                        <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                          errors.titulacion ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <div className="space-y-1 text-center">
                            <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="titulacion"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-azul-primario hover:text-azul-primario/80 focus-within:outline-none"
                              >
                                <span>Subir archivo</span>
                                <input
                                  id="titulacion"
                                  name="titulacion"
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => handleFileChange(e, 'titulacion')}
                                  className="sr-only"
                                />
                              </label>
                              <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-gray-500">
                              PDF o imágenes hasta 5MB
                            </p>
                            {formData.titulacion && (
                              <p className="text-sm text-azul-primario">
                                {formData.titulacion.name}
                              </p>
                            )}
                          </div>
                        </div>
                        {errors.titulacion && (
                          <p className="mt-1 text-sm text-red-600">{errors.titulacion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Términos y condiciones */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="aceptaTerminos"
                          name="aceptaTerminos"
                          type="checkbox"
                          checked={formData.aceptaTerminos}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-azul-primario border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="aceptaTerminos" className="font-medium text-gray-700">
                          Acepto los términos y condiciones *
                        </label>
                        <p className="text-gray-500">
                          Al marcar esta casilla, acepto los términos y condiciones de VirtuAbogado, incluyendo la política de privacidad y el código ético profesional.
                        </p>
                      </div>
                    </div>
                    {errors.aceptaTerminos && (
                      <p className="mt-1 text-sm text-red-600">{errors.aceptaTerminos}</p>
                    )}
                  </div>
                  
                  {/* Mensaje de error general */}
                  {errors.form && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{errors.form}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Nota informativa */}
                  <div className="bg-blue-50 p-4 rounded-md flex">
                    <FiInfo className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Una vez enviada tu solicitud, nuestro equipo la revisará y te contactará para una entrevista donde podremos profundizar en tu experiencia y resolver cualquier duda adicional.
                    </p>
                  </div>
                  
                  {/* Botón de envío */}
                  <div className="flex justify-end">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={isSubmitting}
                      className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario ${
                        isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                    </motion.button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}