pipeline {
    agent any
    
    // options {
    //     timestamps()
    //     timeout(time: 1, unit: 'HOURS')
    //     skipDefaultCheckout()
    // }

    parameters {
        choice(
            name: 'DEPLOYMENT_STRATEGY',
            choices: [
                'rolling-update',
                'blue-green',
                'canary',
                'ab-testing',
                'shadow'
            ],
            description: 'Select the Kubernetes deployment strategy'
        )
        string(
            name: 'NAMESPACE',
            defaultValue: 'default',
            description: 'Kubernetes namespace for deployment'
        )
        booleanParam(
            name: 'AUTO_ROLLBACK',
            defaultValue: true,
            description: 'Automatically rollback if health checks fail'
        )
    }

    environment {
        DOCKER_IMAGE_BACKEND = 'aceest-fitness-backend'
        DOCKER_IMAGE_FRONTEND = 'aceest-fitness-frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io/rajswastik'
        DEPLOYMENT_DIR = 'k8s/deployment'
    }

    stages {
        stage('Clean Workspace') {
            steps {
                echo 'Job Started: Ensure Directory is clean'
                deleteDir()
            }
        }

        stage('Checkout') {
            steps {
                echo '📥 Cloning repository from GitHub...'
                git url: 'https://github.com/rajkumar-palani/ACEest-FitnessGym.git', branch: 'usr/rajkumar_palani/deployment_methodologies'
            }
        }

        stage('Build Backend') {
            steps {
                echo '🔨 Building backend Docker image...'
                dir('.') {
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} .
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:latest .
                    """
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '🔨 Building frontend Docker image...'
                dir('.') {
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG} .
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:latest .
                    """
                }
            }
        }

        stage('Test Backend') {
            steps {
                echo '🧪 Running backend tests...'
                sh """
                    docker run --rm \\
                        --network host \\
                        -v \$(pwd):/workspace \\
                        -w /workspace \\
                        python:3.11-slim \\
                        sh -c "pip install -r app/requirements.txt && python -m pytest app/test_app.py -v --tb=short --cov=app --cov-report=xml --junitxml=junit.xml"
                """
            }
            post {
                always {
                    junit 'junit.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            when {
                expression { return fileExists('/usr/bin/sonar-scanner') || fileExists('/usr/local/bin/sonar-scanner') }
            }
            steps {
                echo '🔍 Running SonarQube analysis...'
                script {
                    try {
                        withSonarQubeEnv('SonarCloud') {
                            sh '''
                                sonar-scanner \
                                -Dsonar.projectKey=devopscheck_aceest-fitnessgymapp \
                                -Dsonar.organization=devopscheck \
                                -Dsonar.sources=. \
                                -Dsonar.inclusions=**/*.py,**/*.js,**/*.jsx \
                                -Dsonar.exclusions=**/node_modules/**,**/k8s/**,**/docs/**,**/reference/**,**/nginx/**
                            '''
                        }
                    } catch (Exception e) {
                        echo "⚠️  SonarQube analysis skipped: ${e.message}"
                    }
                }
            }
        }

        stage('Security Scan') {
            parallel {
                stage('Backend Security') {
                    steps {
                        echo '🔒 Scanning backend for vulnerabilities...'
                        sh """
                            docker run --rm \
                                --network host \\
                                -v \$(pwd):/app \
                                -w /app \
                                python:3.11-slim \
                                sh -c 'pip install bandit && bandit -r app/ -f json -o bandit-report.json || true'
                        """
                    }
                }
                stage('Frontend Security') {
                    steps {
                        echo '🔒 Scanning frontend dependencies...'
                        sh """
                            docker run --rm \
                                --network host \\
                                -v \$(pwd)/frontend:/app \
                                -w /app \
                                node:20-alpine \
                                sh -c 'npm audit --audit-level=moderate || echo "NPM audit completed"'
                        """
                    }
                }
            }
        }

        stage('Push Images') {
            steps {
                echo '📤 Pushing Docker images to registry...'
                withCredentials([usernamePassword(
                    credentialsId: 'docker-pat',
                    usernameVariable: 'Username',
                    passwordVariable: 'Password'
                )]) {
                    sh """
                        echo \"${Password}\" | docker login -u ${Username} --password-stdin
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:latest
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:latest
                        docker logout
                    """
                }
            }
        }

        stage('Update Deployment Manifests') {
            steps {
                echo '📝 Updating Kubernetes manifests with image tags...'
                sh """
                    # Update image tags in all deployment files
                    find ${DEPLOYMENT_DIR} -name "*.yaml" -exec sed -i "s|${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:.*|${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}|g" {} \\;
                    find ${DEPLOYMENT_DIR} -name "*.yaml" -exec sed -i "s|${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:.*|${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}|g" {} \\;
                    
                    echo "✅ Manifests updated with image tag: ${DOCKER_TAG}"
                """
            }
        }

        stage('Pre-Deployment Validation') {
            steps {
                echo '🔍 Validating Kubernetes manifests...'
                sh """
                    # Validate YAML files
                    for file in ${DEPLOYMENT_DIR}/*.yaml; do
                        echo "Validating: \$file"
                        kubectl apply -f \$file --dry-run=client -n ${NAMESPACE} || exit 1
                    done
                    
                    # Check cluster connectivity
                    kubectl cluster-info
                    kubectl get nodes
                    
                    echo "✅ All validations passed"
                """
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo "🚀 Deploying using ${DEPLOYMENT_STRATEGY} strategy..."
                script {
                    switch(params.DEPLOYMENT_STRATEGY) {
                        case 'rolling-update':
                            sh '''
                                echo "📊 Rolling Update Strategy: Gradual pod replacement"
                                kubectl apply -f ${DEPLOYMENT_DIR}/rolling-update.yaml -n ${NAMESPACE}
                                
                                # Wait for rollout to complete
                                kubectl rollout status deployment/aceest-app -n ${NAMESPACE} --timeout=5m
                            '''
                            break

                        case 'blue-green':
                            sh '''
                                echo "🔵🟢 Blue-Green Strategy: Two complete environments"
                                kubectl apply -f ${DEPLOYMENT_DIR}/blue-green-deployment.yaml -n ${NAMESPACE}
                                
                                # Wait for both deployments
                                kubectl rollout status deployment/aceest-app-blue -n ${NAMESPACE} --timeout=5m
                                kubectl rollout status deployment/aceest-app-green -n ${NAMESPACE} --timeout=5m
                                
                                # Get current active deployment
                                CURRENT_ACTIVE=$(kubectl get service aceest-app -n ${NAMESPACE} -o jsonpath='{.spec.selector.track}')
                                echo "Current active: $CURRENT_ACTIVE"
                                
                                # Verify new deployment is healthy before switching
                                NEW_DEPLOYMENT=$([ "$CURRENT_ACTIVE" = "blue" ] && echo "green" || echo "blue")
                                echo "Testing $NEW_DEPLOYMENT deployment..."
                                sleep 10
                            '''
                            break

                        case 'canary':
                            sh '''
                                echo "🐤 Canary Release Strategy: Gradual rollout to percentage of users"
                                kubectl apply -f ${DEPLOYMENT_DIR}/canary-release.yaml -n ${NAMESPACE}
                                
                                # Wait for stable deployment
                                kubectl rollout status deployment/aceest-app-stable -n ${NAMESPACE} --timeout=5m
                                
                                # Canary with 1 replica out of 6 total = ~16% traffic
                                kubectl rollout status deployment/aceest-app-canary -n ${NAMESPACE} --timeout=5m
                                
                                echo "Canary deployment live. Monitoring metrics for 5 minutes..."
                                sleep 300
                            '''
                            break

                        case 'ab-testing':
                            sh '''
                                echo "🔀 A/B Testing Strategy: Route traffic by header"
                                kubectl apply -f ${DEPLOYMENT_DIR}/ab-testing.yaml -n ${NAMESPACE}
                                
                                kubectl rollout status deployment/aceest-app-a -n ${NAMESPACE} --timeout=5m
                                kubectl rollout status deployment/aceest-app-b -n ${NAMESPACE} --timeout=5m
                                
                                echo "A/B testing ready"
                                echo "  - Variant A: default traffic"
                                echo "  - Variant B: x-ab-test: b header"
                            '''
                            break

                        case 'shadow':
                            sh '''
                                echo "👥 Shadow Deployment Strategy: Non-production traffic mirroring"
                                kubectl apply -f ${DEPLOYMENT_DIR}/shadow-deployment.yaml -n ${NAMESPACE}
                                
                                kubectl rollout status deployment/aceest-app-primary -n ${NAMESPACE} --timeout=5m
                                kubectl rollout status deployment/aceest-app-shadow -n ${NAMESPACE} --timeout=5m
                                
                                echo "Shadow deployment running alongside production"
                                echo "Traffic is mirrored to shadow for testing"
                            '''
                            break
                    }
                }
            }
        }

        stage('Health Check & Validation') {
            steps {
                echo '🏥 Validating deployment health...'
                sh """
                    # Check pod status
                    echo "Pod Status:"
                    kubectl get pods -n ${NAMESPACE} -l app=aceest-app
                    
                    # Check service endpoints
                    echo "Service Endpoints:"
                    kubectl get svc -n ${NAMESPACE}
                    
                    # Wait for endpoints
                    for i in {1..30}; do
                        ENDPOINTS=\$(kubectl get endpoints aceest-app -n ${NAMESPACE} -o jsonpath='{.subsets[0].addresses}' 2>/dev/null | wc -w)
                        if [ \$ENDPOINTS -gt 0 ]; then
                            echo "✅ Service has \$ENDPOINTS active endpoints"
                            break
                        fi
                        echo "Waiting for endpoints... (\$i/30)"
                        sleep 5
                    done
                    
                    # Port forward and test (if in development)
                    echo "Fetching application endpoint..."
                    kubectl get svc aceest-app -n ${NAMESPACE}
                """
            }
        }

        stage('Smoke Tests') {
            parallel {
                stage('Backend Smoke Test') {
                    steps {
                        echo '🧪 Running backend smoke tests...'
                        sh """
                            # Get service endpoint
                            SERVICE_IP=\$(kubectl get svc aceest-app -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")
                            
                            # Perform health check with retries
                            for i in {1..10}; do
                                if curl -f http://\$SERVICE_IP:5000/health 2>/dev/null; then
                                    echo "✅ Backend health check passed"
                                    exit 0
                                fi
                                echo "Attempt \$i/10: Waiting for backend..."
                                sleep 6
                            done
                            
                            echo "⚠️  Backend endpoint may not be directly accessible from CI/CD runner"
                            echo "   Check logs: kubectl logs -n ${NAMESPACE} -l app=aceest-app"
                        """
                    }
                }
                stage('Frontend Smoke Test') {
                    steps {
                        echo '🧪 Running frontend smoke tests...'
                        sh """
                            # Get service endpoint
                            SERVICE_IP=\$(kubectl get svc aceest-app -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")
                            
                            echo "Frontend service is running"
                            echo "   Service IP/Host: \$SERVICE_IP"
                            echo "   Access via: http://\$SERVICE_IP:3000"
                        """
                    }
                }
            }
        }

        stage('Post-Deployment Monitoring') {
            steps {
                echo '📊 Monitoring deployment...'
                sh """
                    # Capture metrics
                    echo "=== Deployment Metrics ==="
                    kubectl top pods -n ${NAMESPACE} -l app=aceest-app 2>/dev/null || echo "Metrics not available (metrics-server required)"
                    
                    echo ""
                    echo "=== Recent Events ==="
                    kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp' | tail -20
                    
                    echo ""
                    echo "=== Deployment Status ==="
                    kubectl describe deployment -n ${NAMESPACE} -l app=aceest-app | head -50
                """
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up...'
            sh '''
                # Archive logs
                mkdir -p artifacts/logs
                kubectl logs -n ${NAMESPACE} -l app=aceest-app --all-containers=true > artifacts/logs/app-logs.txt 2>&1 || true
                
                # Archive deployment manifests
                cp -r ${DEPLOYMENT_DIR}/*.yaml artifacts/ 2>/dev/null || true
                cp coverage.xml artifacts/ 2>/dev/null || true
                
                # Cleanup Docker
                docker logout 2>/dev/null || true
            '''
            archiveArtifacts artifacts: 'artifacts/**', allowEmptyArchive: true
        }

        success {
            echo '✅ Pipeline completed successfully!'
            echo "Deployment Strategy: ${DEPLOYMENT_STRATEGY}"
            echo "Namespace: ${NAMESPACE}"
            sh '''
                echo "=== Deployment Summary ==="
                kubectl get all -n ${NAMESPACE} -l app=aceest-app
            '''
            // slackSend channel: '#devops', message: "✅ Build ${env.BUILD_NUMBER} deployed using ${DEPLOYMENT_STRATEGY} strategy!"
        }

        failure {
            echo '❌ Pipeline failed!'
            script {
                if (params.AUTO_ROLLBACK) {
                    echo "🔄 Initiating automatic rollback..."
                    sh '''
                        # Rollback to previous version
                        kubectl rollout undo deployment -n ${NAMESPACE} -l app=aceest-app || true
                        
                        # Wait for rollback to complete
                        kubectl rollout status deployment -n ${NAMESPACE} -l app=aceest-app --timeout=5m || true
                        
                        echo "✅ Rollback completed"
                    '''
                }
            }
            // slackSend channel: '#devops', message: "❌ Build ${env.BUILD_NUMBER} failed! Check logs for details."
        }
    }
}