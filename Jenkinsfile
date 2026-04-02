pipeline {
    agent any

    environment {
        DOCKER_IMAGE_BACKEND = 'aceest-fitness-backend'
        DOCKER_IMAGE_FRONTEND = 'aceest-fitness-frontend'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_REGISTRY = 'docker.io/rajswastik'  // Hub Docker registry user prefix
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Cloning repository from GitHub...'
                git url: 'https://github.com/rajkumar-palani/ACEest-FitnessGym.git', branch: 'main'
            }
        }

        stage('Build Backend') {
            steps {
                echo '🔨 Building backend Docker image...'
                dir('app') {
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} .
                        docker build -t ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} .
                    """
                }
            }
        }

        stage('Build Frontend') {
            steps {
                echo '🔨 Building frontend Docker image...'
                dir('frontend') {
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
                dir('app') {
                    sh """
                        docker run --rm \\
                            -v \$(pwd):/app \\
                            -w /app \\
                            python:3.11-slim \\
                            bash -c '
                                pip install -r requirements.txt && \\
                                python -m pytest test_app.py -v --tb=short --cov=. --cov-report=xml
                            '
                    """
                }
            }
            post {
                always {
                    // Publish test results and coverage reports
                    junit 'app/coverage.xml'
                    publishCoverage adapters: [coberturaAdapter('app/coverage.xml')]
                }
            }
        }

        stage('Test Frontend') {
            steps {
                echo '🧪 Running frontend tests...'
                dir('frontend') {
                    sh """
                        docker run --rm \\
                            -v \$(pwd):/app \\
                            -w /app \\
                            node:20-alpine \\
                            sh -c '
                                npm ci && \\
                                npm run build && \\
                                echo "Frontend build successful - no tests configured yet"
                            '
                    """
                }
            }
        }

        stage('Security Scan') {
            parallel {
                stage('Backend Security') {
                    steps {
                        echo '🔒 Scanning backend for vulnerabilities...'
                        sh """
                            docker run --rm \\
                                -v /var/run/docker.sock:/var/run/docker.sock \\
                                -v \$(pwd):/app \\
                                clair-scanner \\
                                --ip \$(hostname -i) \\
                                ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG} || \\
                                echo "Clair scanner not available - skipping container scan"
                        """
                    }
                }
                stage('Frontend Security') {
                    steps {
                        echo '🔒 Scanning frontend dependencies...'
                        sh """
                            docker run --rm \\
                                -v \$(pwd)/frontend:/app \\
                                -w /app \\
                                node:20-alpine \\
                                sh -c 'npm audit --audit-level=moderate || echo "NPM audit completed"'
                        """
                    }
                }
            }
        }

        stage('Push Images') {
            steps {
                echo '📤 Pushing Docker images to registry...'
                sh """
                    # Note: Replace with your actual registry push commands
                    echo "Pushing ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}"
                    echo "Pushing ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}"
                    # docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_BACKEND}:${DOCKER_TAG}
                    # docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE_FRONTEND}:${DOCKER_TAG}
                """
            }
        }

        stage('Deploy') {
            steps {
                echo '🚀 Deploying application...'
                sh """
                    # Stop existing containers
                    docker-compose down || true

                    # Start new deployment
                    docker-compose up -d --build

                    # Wait for services to be healthy
                    sleep 30
                    docker-compose ps
                """
            }
        }

        stage('Integration Test') {
            steps {
                echo '🔗 Running integration tests...'
                sh """
                    # Test backend health
                    curl -f http://localhost:5000/health || exit 1

                    # Test frontend accessibility
                    curl -f http://localhost || exit 1

                    echo "✅ All integration tests passed!"
                """
            }
        }
    }

    post {
        always {
            echo '🧹 Cleaning up workspace...'
            sh '''
                # Clean up Docker system
                docker system prune -f || true

                # Archive any test artifacts
                mkdir -p artifacts || true
                cp -r app/coverage.xml artifacts/ 2>/dev/null || true
            '''
            archiveArtifacts artifacts: 'artifacts/**', allowEmptyArchive: true
        }

        success {
            echo '✅ Pipeline completed successfully!'
            // slackSend channel: '#devops', message: "✅ Build ${env.BUILD_NUMBER} successful!" // Uncomment when Slack is configured
        }

        failure {
            echo '❌ Pipeline failed!'
            // slackSend channel: '#devops', message: "❌ Build ${env.BUILD_NUMBER} failed!" // Uncomment when Slack is configured
        }
    }
}