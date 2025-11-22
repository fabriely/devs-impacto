
# Implementation Plan

- [x] 1. Setup Python environment and project structure






  - Create virtual environment using uv
  - Install core dependencies (FastAPI, SQLAlchemy, Hypothesis, pytest, Streamlit, OpenAI)
  - Create project directory structure (src/, tests/, data/)
  - Setup .env configuration file
  - _Requirements: All_

- [x] 2. Implement database models and initialization




  - [x] 2.1 Create SQLAlchemy models for all tables


    - Implement Cidadao, ProjetoLei, Interacao, PropostaPauta, MetricaLacuna models
    - Define relationships and foreign keys
    - Add indexes for performance
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.2 Write property test for referential integrity


    - **Property 4: Referential integrity enforcement**
    - **Validates: Requirements 9.5**

  - [x] 2.3 Create database initialization script


    - Implement init_database() function
    - Create SQLite database file
    - Run migrations to create all tables
    - _Requirements: 9.1_

- [x] 3. Implement data persistence layer



  - [x] 3.1 Create DataProcessor class with persistence methods


    - Implement process_interaction() method
    - Implement process_proposal() method
    - Add validation for required fields
    - _Requirements: 4.1, 4.4_

  - [x] 3.2 Write property test for interaction persistence completeness


    - **Property 1: Interaction persistence completeness**
    - **Validates: Requirements 4.1**

  - [x] 3.3 Write property test for citizen data completeness


    - **Property 3: Citizen data completeness**
    - **Validates: Requirements 4.4**

  - [x] 3.4 Write property test for concurrent persistence


    - **Property 2: Concurrent interaction persistence**
    - **Validates: Requirements 4.2**

- [x] 4. Implement error handling and resilience



  - [x] 4.1 Create ErrorHandler class with retry logic


    - Implement handle_with_retry() with exponential backoff
    - Implement handle_validation_error()
    - Implement handle_database_error()
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Write property test for retry with exponential backoff


    - **Property 21: Retry with exponential backoff**
    - **Validates: Requirements 1.5, 4.3, 7.2**

  - [x] 4.3 Write property test for error logging completeness


    - **Property 22: Error logging completeness**
    - **Validates: Requirements 7.1**

  - [x] 4.4 Write property test for critical error notification


    - **Property 23: Critical error notification**
    - **Validates: Requirements 7.3**

  - [x] 4.5 Create TemporaryQueue class for resilience



    - Implement enqueue() method
    - Implement process_queue() method
    - Handle queue file operations
    - _Requirements: 4.5, 7.4_

  - [x] 4.6 Write property test for queue persistence on database unavailability


    - **Property 24: Queue persistence on database unavailability**
    - **Validates: Requirements 4.5**

  - [x] 4.7 Write property test for queue processing after recovery


    - **Property 25: Queue processing after recovery**
    - **Validates: Requirements 7.4**

  - [x] 4.8 Write property test for corrupted data isolation


    - **Property 26: Corrupted data isolation**
    - **Validates: Requirements 7.5**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.





- [ ] 6. Implement AI classification component
  - [ ] 6.1 Create AIClassifier class with OpenAI integration



    - Implement classify_theme() method using GPT-4
    - Implement detect_similarity() using embeddings
    - Define TEMAS constant list
    - _Requirements: 3.3, 10.1_

  - [x] 6.2 Write property test for automatic theme classification


    - **Property 8: Automatic theme classification**
    - **Validates: Requirements 3.3, 10.1**

  - [ ] 6.3 Write property test for classification confidence scoring
    - **Property 9: Classification confidence scoring**
    - **Validates: Requirements 10.2**

  - [ ] 6.4 Write property test for low confidence flagging
    - **Property 10: Low confidence flagging**
    - **Validates: Requirements 10.3**

  - [ ] 6.5 Write property test for multi-theme classification
    - **Property 14: Multi-theme classification**
    - **Validates: Requirements 10.5**

  - [ ] 6.6 Implement duplicate detection logic
    - Use embeddings to calculate similarity
    - Group proposals with similarity > 0.85
    - Assign grupo_duplicatas identifier
    - _Requirements: 3.5, 10.4_

  - [ ] 6.7 Write property test for duplicate proposal grouping
    - **Property 13: Duplicate proposal grouping**
    - **Validates: Requirements 3.5, 10.4**

- [ ] 7. Implement FastAPI endpoints
  - [ ] 7.1 Create FastAPI application and base configuration
    - Setup FastAPI app with CORS
    - Configure logging
    - Add health check endpoint
    - _Requirements: All_

  - [ ] 7.2 Implement POST /interactions endpoint
    - Create Pydantic request/response models
    - Integrate with DataProcessor
    - Add error handling
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 7.3 Write property test for opinion registration with metadata
    - **Property 5: Opinion registration with metadata**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

  - [ ] 7.4 Write property test for reaction capture and association
    - **Property 6: Reaction capture and association**
    - **Validates: Requirements 2.4**

  - [ ] 7.5 Write property test for PL visualization tracking
    - **Property 7: PL visualization tracking**
    - **Validates: Requirements 1.4**

  - [ ] 7.6 Implement POST /proposals endpoint
    - Create Pydantic request/response models
    - Integrate with AIClassifier and DataProcessor
    - Handle both text and audio proposals
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 7.7 Write property test for proposal metadata association
    - **Property 11: Proposal metadata association**
    - **Validates: Requirements 3.4**

  - [ ] 7.8 Write property test for audio proposal dual storage
    - **Property 12: Audio proposal dual storage**
    - **Validates: Requirements 3.2**

  - [ ] 7.9 Implement GET /metrics/lacuna endpoint
    - Return cached metrics from database
    - Format response with lacunas by theme, group, city
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Implement metrics calculation component
  - [ ] 8.1 Create MetricsCalculator class
    - Implement calculate_lacuna_by_theme()
    - Implement calculate_lacuna_by_group()
    - Implement calculate_lacuna_by_city()
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 8.2 Write property test for lacuna calculation formula
    - **Property 15: Lacuna calculation formula**
    - **Validates: Requirements 5.3**

  - [ ] 8.3 Write property test for high lacuna classification
    - **Property 16: High lacuna classification**
    - **Validates: Requirements 5.4**

  - [ ] 8.4 Write property test for demand counting by theme and region
    - **Property 17: Demand counting by theme and region**
    - **Validates: Requirements 5.1**

  - [ ] 8.5 Write property test for PL counting by theme and region
    - **Property 18: PL counting by theme and region**
    - **Validates: Requirements 5.2**

  - [ ] 8.6 Write property test for lacuna segmentation by inclusion group
    - **Property 19: Lacuna segmentation by inclusion group**
    - **Validates: Requirements 5.5**

  - [ ] 8.7 Create background job to recalculate metrics
    - Schedule metrics recalculation every 5 minutes
    - Update metricas_lacuna table
    - _Requirements: 6.5_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement security and privacy features
  - [ ] 10.1 Create encryption utilities for PII
    - Implement encrypt_telefone() using Fernet
    - Implement decrypt_telefone() for internal use
    - Generate and store encryption key
    - _Requirements: 8.1_

  - [ ] 10.2 Write property test for PII encryption at rest
    - **Property 27: PII encryption at rest**
    - **Validates: Requirements 8.1**

  - [ ] 10.3 Implement dashboard anonymization logic
    - Filter out telefone_hash from all queries
    - Ensure no direct identifiers in responses
    - _Requirements: 8.3_

  - [ ] 10.4 Write property test for dashboard anonymization
    - **Property 28: Dashboard anonymization**
    - **Validates: Requirements 8.3**

  - [ ] 10.5 Implement log sanitization
    - Create logging filter to remove PII
    - Configure logger to use sanitization filter
    - _Requirements: 8.4_

  - [ ] 10.6 Write property test for log PII exclusion
    - **Property 29: Log PII exclusion**
    - **Validates: Requirements 8.4**

  - [ ] 10.7 Implement access audit logging
    - Log all database queries accessing citizen data
    - Include timestamp and query type
    - _Requirements: 8.5_

  - [ ] 10.8 Write property test for access audit trail
    - **Property 30: Access audit trail**
    - **Validates: Requirements 8.5**

- [ ] 11. Implement Streamlit dashboard
  - [ ] 11.1 Create dashboard main page with KPIs
    - Display total cidadãos engajados
    - Display total opiniões
    - Display total propostas de pauta
    - _Requirements: 6.1_

  - [ ] 11.2 Create lacuna legislativa visualization page
    - Display bar chart of lacuna by theme
    - Display segmentation by grupo_inclusao
    - Display segmentation by cidade
    - _Requirements: 6.2_

  - [ ] 11.3 Create propostas populares page
    - Display table of most frequent proposals
    - Order by volume descending
    - Show tema, conteúdo, count
    - _Requirements: 6.4_

  - [ ] 11.4 Write property test for dashboard proposal ordering
    - **Property 20: Dashboard proposal ordering**
    - **Validates: Requirements 6.4**

  - [ ] 11.5 Implement auto-refresh mechanism
    - Configure Streamlit to refresh every 5 seconds
    - Query latest data from database
    - _Requirements: 6.5_

  - [ ] 11.6 Create map visualization of engagement by city
    - Use Plotly or Folium for map
    - Show cities with most demands vs most PLs
    - _Requirements: 6.3_

- [ ] 12. Integration with existing Node.js bot
  - [ ] 12.1 Create pipeline service in Node.js bot
    - Implement sendInteractionToPipeline() function
    - Implement sendProposalToPipeline() function
    - Add error handling for pipeline unavailability
    - _Requirements: All_

  - [ ] 12.2 Update WhatsApp controller to call pipeline service
    - Call pipeline when citizen sends opinion
    - Call pipeline when citizen sends proposal
    - Call pipeline when citizen views PL
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [ ] 12.3 Write integration test for end-to-end flow
    - Test bot → API → database → dashboard flow
    - Verify data appears correctly in dashboard
    - _Requirements: All_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Documentation and deployment preparation
  - [ ] 14.1 Create README with setup instructions
    - Document uv and venv setup
    - Document environment variables
    - Document how to run API and dashboard
    - _Requirements: All_

  - [ ] 14.2 Create requirements.txt with all dependencies
    - List all Python packages
    - Pin versions for reproducibility
    - _Requirements: All_

  - [ ] 14.3 Create example .env file
    - Document all required environment variables
    - Provide example values
    - _Requirements: All_

